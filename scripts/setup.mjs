import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { externalWorkspace } from './workspace.mjs';

const root = await externalWorkspace();
for (const file of ['secrets/postgres-admin-password', 'secrets/backend/spring.datasource.password', 'secrets/backend/spring.flyway.password']) {
  try { await writeFile(join(root, file), randomBytes(32).toString('base64url'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}
console.log('Development database secrets are ready outside the checkout. Existing secrets were preserved.');
