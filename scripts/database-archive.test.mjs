import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decryptArchive, encryptArchive } from "./database-archive.mjs";

test("encrypted database archives authenticate before exposing bytes", () => {
  const key = randomBytes(32);
  const plain = Buffer.from("fictional portfolio bytes");
  const archive = encryptArchive(plain, key);
  assert.equal(archive.includes(plain), false);
  assert.notDeepEqual(archive, encryptArchive(plain, key));
  assert.deepEqual(decryptArchive(archive, key), plain);
  const changed = Buffer.from(archive);
  changed[changed.length - 1] ^= 1;
  assert.throws(() => decryptArchive(changed, key), /authentication/);
  assert.throws(() => decryptArchive(archive, randomBytes(32)), /authentication/);
  assert.throws(() => decryptArchive(archive.subarray(0, 5), key), /Unsupported/);
});
