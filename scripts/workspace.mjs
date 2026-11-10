import { access, mkdir, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, parse } from 'node:path';

export async function externalWorkspace() {
  const value = process.env.FINN_WORKSPACE_ROOT;
  if (!value || !isAbsolute(value)) throw new Error('Set FINN_WORKSPACE_ROOT to an existing absolute directory outside Git checkouts.');
  const root = await realpath(value);
  if (!(await stat(root)).isDirectory() || root === parse(root).root) throw new Error('Choose a dedicated external working directory.');
  for (let path = root; ; path = dirname(path)) {
    try { await access(join(path, '.git')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; if (path === dirname(path)) break; continue; }
    throw new Error('FINN_WORKSPACE_ROOT must stay outside every Git checkout.');
  }
  for (const child of ['cache/java-home', 'tmp/backend', 'build/backend', 'secrets/backend', 'secrets/identity', 'data/postgres']) {
    await mkdir(join(root, child), { recursive: true });
    const resolved = await realpath(join(root, child));
    if (!resolved.startsWith(root + (process.platform === 'win32' ? '\\' : '/'))) throw new Error('An external output directory resolves outside the working directory.');
  }
  return root;
}
