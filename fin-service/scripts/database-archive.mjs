import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { open, readFile, realpath, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { externalWorkspace } from "./workspace.mjs";

const magic = Buffer.from("FINNDB1");
const nonceBytes = 12;
const tagBytes = 16;
const archiveLimit = 256 * 1024 * 1024;
const cipherName = "aes-256-gcm";

export function encryptArchive(bytes, key) {
  const nonce = randomBytes(nonceBytes);
  const cipher = createCipheriv(cipherName, key, nonce, { authTagLength: tagBytes });
  cipher.setAAD(magic);
  return Buffer.concat([magic, nonce, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
}

export function decryptArchive(bytes, key) {
  if (bytes.length <= magic.length + nonceBytes + tagBytes || !bytes.subarray(0, magic.length).equals(magic)) {
    throw new Error("Unsupported encrypted archive.");
  }
  const header = magic.length + nonceBytes;
  const decipher = createDecipheriv(cipherName, key, bytes.subarray(magic.length, header), { authTagLength: tagBytes });
  decipher.setAAD(magic);
  decipher.setAuthTag(bytes.subarray(-tagBytes));
  const clear = decipher.update(bytes.subarray(header, -tagBytes));
  try {
    const tail = decipher.final();
    return tail.length === 0 ? clear : Buffer.concat([clear, tail]);
  } catch {
    clear.fill(0);
    throw new Error("Archive authentication failed.");
  }
}

function requireInside(root, path) {
  const value = relative(root, path);
  if (!value || value.startsWith("..") || isAbsolute(value)) throw new Error("Keep archive files in the external workspace.");
}

async function existing(root, path, limit) {
  const resolved = await realpath(path);
  requireInside(root, resolved);
  const details = await stat(resolved);
  if (!details.isFile() || details.size > limit) throw new Error("Unsupported archive or key size.");
  return readFile(resolved);
}

async function privateWrite(root, path, data) {
  const folder = await realpath(dirname(path));
  const target = join(folder, basename(path));
  requireInside(root, target);
  const file = await open(target, "wx", 0o600);
  try {
    await file.writeFile(data);
    await file.sync();
  } finally {
    await file.close();
  }
}

async function postgres(container, database, tool, args, input, limit = archiveLimit) {
  const child = spawn("docker", ["exec", "-i", container, tool, "-U", "finn_bootstrap", "-d", database, ...args], {
    stdio: ["pipe", "pipe", "ignore"], windowsHide: true,
  });
  const completion = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  const deadline = setTimeout(() => child.kill(), 120000);
  child.stdin.on("error", () => { /* A rejected database operation can close stdin early. */ });
  child.stdin.end(input);
  const chunks = [];
  let length = 0;
  try {
    for await (const chunk of child.stdout) {
      length += chunk.length;
      if (length > limit) {
        child.kill();
        throw new Error("Archive exceeds the supported in-memory size.");
      }
      chunks.push(chunk);
    }
    if (await completion !== 0) throw new Error("PostgreSQL command failed or timed out.");
    return Buffer.concat(chunks, length);
  } finally {
    clearTimeout(deadline);
    await completion.catch(() => {});
  }
}

async function run([mode, container, database, archivePath, keyPath]) {
  const root = await externalWorkspace();
  if (!["backup", "restore"].includes(mode) || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(container ?? "") ||
      !/^[a-z][a-z0-9_]{0,62}$/.test(database ?? "") || !archivePath || !keyPath) {
    throw new Error("Use backup or restore followed by container, database, archive file and 32-byte key file.");
  }
  const key = await existing(root, keyPath, 32);
  if (key.length !== 32) throw new Error("Use a 32-byte archive key.");
  let dump;
  try {
    if (mode === "backup") {
      dump = await postgres(container, database, "pg_dump", ["--format=custom",
        "--exclude-table-data=finn.spring_session", "--exclude-table-data=finn.spring_session_attributes"]);
      if (dump.length === 0) throw new Error("PostgreSQL returned an empty archive.");
      await privateWrite(root, archivePath, encryptArchive(dump, key));
      console.log("Encrypted archive written. Authentication sessions are excluded from the application database archive.");
    } else {
      const encrypted = await existing(root, archivePath, archiveLimit + magic.length + nonceBytes + tagBytes);
      dump = decryptArchive(encrypted, key);
      const empty = await postgres(container, database, "psql", ["-X", "--no-align", "--tuples-only", "--set=ON_ERROR_STOP=1",
        "-c", "SELECT NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('public','information_schema')) AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public')"], undefined, 1024);
      if (empty.toString("utf8").trim() !== "t") throw new Error("Restore requires an empty target database.");
      await postgres(container, database, "pg_restore", ["--single-transaction", "--exit-on-error"], dump, 4096);
      console.log("Authenticated archive restored to the empty database.");
    }
  } finally {
    dump?.fill(0);
    key.fill(0);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error.code ? "Archive file or database could not be accessed." : error.message);
    process.exitCode = 1;
  });
}
