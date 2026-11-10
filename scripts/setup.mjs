import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { externalWorkspace } from './workspace.mjs';

const root = await externalWorkspace();
for (const file of ['secrets/postgres-admin-password', 'secrets/backend/spring.datasource.password', 'secrets/backend/spring.flyway.password', 'secrets/identity-postgres-password', 'secrets/identity-admin-password', 'secrets/backend/finn.oidc.client-secret']) {
  try { await writeFile(join(root, file), randomBytes(32).toString('base64url'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}
const usersFile = join(root, 'secrets/identity/demo-users.json');
try {
  const users = ['demo-one', 'demo-two'].map((username) => ({username, password: randomBytes(24).toString('base64url')}));
  await writeFile(usersFile, JSON.stringify(users), { flag: 'wx', mode: 0o600 });
} catch (error) { if (error.code !== 'EEXIST') throw error; }
const users = JSON.parse(await readFile(usersFile, 'utf8'));
const clientSecret = await readFile(join(root, 'secrets/backend/finn.oidc.client-secret'), 'utf8');
const realm = {
  realm: 'finn-local', enabled: true, registrationAllowed: true, resetPasswordAllowed: false,
  loginWithEmailAllowed: false, verifyEmail: false, sslRequired: 'external',
  clients: [{clientId: 'finn-web', protocol: 'openid-connect', publicClient: false, secret: clientSecret,
    standardFlowEnabled: true, directAccessGrantsEnabled: false, serviceAccountsEnabled: false,
    redirectUris: ['http://127.0.0.1:5173/login/oauth2/code/finn'], webOrigins: ['http://127.0.0.1:5173'],
    defaultClientScopes: ['profile', 'web-origins'],
    attributes: {'pkce.code.challenge.method':'S256', 'post.logout.redirect.uris':'http://127.0.0.1:5173/'}}],
  users: users.map((user) => ({username:user.username, enabled:true, firstName:'Demo', lastName:'Investor',
    email:user.username+'@example.invalid', emailVerified:true,
    credentials:[{type:'password', value:user.password, temporary:false}]})),
};
await writeFile(join(root, 'secrets/identity/finn-local-realm.json'), JSON.stringify(realm), { mode:0o600 });
console.log('Local database and identity configuration is ready outside the checkout. Existing credentials were preserved.');
