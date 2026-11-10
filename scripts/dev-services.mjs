import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { externalWorkspace } from './workspace.mjs';

await externalWorkspace();
const cwd = dirname(dirname(fileURLToPath(import.meta.url)));
for (const args of [
  ['compose','up','-d','--wait','postgres'],
  ['compose','exec','-T','postgres','bash','/docker-entrypoint-initdb.d/20-create-identity.sh'],
  ['compose','up','-d','--wait','identity'],
]) {
  const result = spawnSync('docker', args, {cwd, env:process.env, stdio:'inherit', windowsHide:true});
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
