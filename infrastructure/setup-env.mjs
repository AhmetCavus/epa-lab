import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { URL } from 'node:url';

const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
const secretNames = [
  'KEYCLOAK_ADMIN_PASSWORD',
  'OIDC_CLIENT_SECRET',
  'TEST_USER_PASSWORD',
  'RES_SERVER_DB_PASSWORD',
];
const configuration = template.replace(
  new RegExp(`^(${secretNames.join('|')})=$`, 'gm'),
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

  const environmentPath = new URL('../.env', import.meta.url);
  const existing = await readFile(environmentPath, 'utf8');
  let updated = existing;

  for (const name of secretNames) {
    if (new RegExp(`^${name}=.+$`, 'm').test(updated)) {
      continue;
    }

    const entry = `${name}=${randomBytes(32).toString('base64url')}`;
    const blankEntry = new RegExp(`^${name}=$`, 'm');
    updated = blankEntry.test(updated)
      ? updated.replace(blankEntry, entry)
      : `${updated.trimEnd()}\n${entry}\n`;
  }

  if (updated !== existing) {
    await writeFile(environmentPath, updated, { mode: 0o600 });
    console.info('Fehlende lokale Zugangsdaten ergänzt; vorhandene Werte bleiben erhalten.');
  } else {
    console.info('Vorhandene .env bleibt erhalten.');
  }
}
