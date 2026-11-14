import { pathToFileURL } from 'node:url';
import { adminApi, ownerAttribute, requireCondition } from './standard-client.mjs';
import {
  publicOwner,
  publicRealmDefinition,
  publicRealmName,
  publicRealmSettings,
  verifyPublicRealm,
} from './public-realm.mjs';

export function demoAccountSettings(environment = process.env) {
  const username = environment.PLAYGROUND_DEMO_USERNAME;
  const password = environment.PLAYGROUND_DEMO_INITIAL_PASSWORD;
  requireCondition(
    typeof username === 'string' && /^demo-[a-z0-9]{4,32}$/.test(username),
    'Use an individual synthetic demo alias',
  );
  requireCondition(
    typeof password === 'string' &&
      password.length >= 16 &&
      password.length <= 128 &&
      !/[\r\n]/.test(password),
    'An initial password of 16–128 characters is required',
  );
  return { username, password };
}

export async function provisionDemoAccount({ settings, account }) {
  const api = await adminApi(settings, publicRealmName);
  await verifyPublicRealm(api, await publicRealmDefinition(settings));
  const matches = await api(`/users?username=${encodeURIComponent(account.username)}&exact=true`);
  requireCondition(matches.length <= 1, 'Ambiguous demo account');
  if (matches.length === 1) {
    const existing = matches[0];
    requireCondition(
      existing.attributes?.[ownerAttribute]?.[0] === publicOwner &&
        existing.enabled &&
        existing.username === account.username &&
        existing.email === `${account.username}@example.invalid` &&
        existing.firstName === 'Synthetic' &&
        existing.lastName === 'Demo',
      'Existing demo account conflicts with the owned definition',
    );
    // A repeat never resets credentials, required actions, sessions or completed first login.
    return { status: 'unchanged' };
  }
  await api('/users', 'POST', {
    username: account.username,
    enabled: true,
    email: `${account.username}@example.invalid`,
    firstName: 'Synthetic',
    lastName: 'Demo',
    attributes: { [ownerAttribute]: [publicOwner] },
    requiredActions: ['UPDATE_PASSWORD'],
    credentials: [{ type: 'password', value: account.password, temporary: true }],
  });
  return { status: 'created' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    requireCondition(process.argv.length === 2, 'No command-line credentials are accepted');
    console.info(
      JSON.stringify(
        await provisionDemoAccount({
          settings: publicRealmSettings(),
          account: demoAccountSettings(),
        }),
      ),
    );
  } catch {
    console.error('Synthetic account provisioning failed; inspect private configuration.');
    process.exitCode = 1;
  }
}
