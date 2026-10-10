import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
const configuration = template.replace(
  /^(KEYCLOAK_ADMIN_PASSWORD|OIDC_CLIENT_SECRET|TEST_USER_PASSWORD)=$/gm,
  (_, name) => `${name}=${randomBytes(32).toString('base64url')}`,
);

try {
  await writeFile(new URL('../.env', import.meta.url), configuration, {
    flag: 'wx',
    mode: 0o600,
  });
  console.info('.env mit zufälligen lokalen Zugangsdaten angelegt.');
} catch (error) {
  if (error.code !== 'EEXIST') {
    throw error;
  }

  console.info('Vorhandene .env bleibt erhalten.');
}
