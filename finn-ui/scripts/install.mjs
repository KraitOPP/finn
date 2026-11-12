import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { externalWorkspace } from './workspace.mjs';

const root = await externalWorkspace();
const windows = process.platform === 'win32';
const child = spawn(windows ? 'cmd.exe' : 'npm', windows ? ['/d', '/s', '/c', 'npm ci'] : ['ci'], {
  cwd: dirname(dirname(fileURLToPath(import.meta.url))), stdio: 'inherit', windowsHide: true,
  env: { ...process.env, npm_config_cache: join(root, 'cache/npm') },
});
child.on('error', () => { console.error('npm could not start. Use the documented Node.js 24 toolchain.'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
