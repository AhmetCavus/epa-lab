import { pathToFileURL } from 'node:url';
import {
  adminApi,
  matchesFields,
  ownerAttribute,
  owns,
  privateUrl,
  readStandardResources,
  requireCondition,
  standardDefinition,
  verifyStandardClient,
} from './standard-client.mjs';

export const publicOrigin = 'https://auth-playground.yappai.de';
export const publicRealmName = 'playground-public';
export const publicIssuer = `${publicOrigin}/realms/${publicRealmName}`;
export const publicCallback = `${publicOrigin}/api/oauth/callback`;
export const publicOwner = 'public-playground-oauth-deployment';

const unusedBrowserClients = new Set([
  'account',
  'account-console',
  'admin-cli',
  'broker',
  'security-admin-console',
]);
const accountOwnerAttribute = {
  name: ownerAttribute,
  displayName: 'Provisioning owner',
  permissions: { view: ['admin'], edit: ['admin'] },
  multivalued: false,
};

export function publicRealmSettings(environment = process.env) {
  const server = privateUrl(environment.KEYCLOAK_ADMIN_URL ?? environment.KEYCLOAK_HOSTNAME);
  requireCondition(server.pathname === '/', 'Keycloak administration requires a private origin');
  for (const [name, expected] of [
    ['PLAYGROUND_APP_ORIGIN', publicOrigin],
    ['PLAYGROUND_OIDC_ISSUER', publicIssuer],
    ['PLAYGROUND_OIDC_REDIRECT_URI', publicCallback],
    ['PLAYGROUND_OIDC_CLIENT_ID', 'playground-oidc'],
  ]) {
    requireCondition(
      environment[name] === undefined || environment[name] === expected,
      `Invalid public setting: ${name}`,
    );
  }
  requireCondition(
    typeof environment.PLAYGROUND_OIDC_CLIENT_SECRET === 'string' &&
      environment.PLAYGROUND_OIDC_CLIENT_SECRET.length >= 32 &&
      environment.PLAYGROUND_OIDC_CLIENT_SECRET.length <= 1024,
    'Invalid public setting: PLAYGROUND_OIDC_CLIENT_SECRET',
  );
  requireCondition(
    environment.KEYCLOAK_ADMIN_USERNAME && environment.KEYCLOAK_ADMIN_PASSWORD,
    'Private Keycloak administrator credentials are required',
  );
  return {
    server: server.origin,
    callback: publicCallback,
    secret: environment.PLAYGROUND_OIDC_CLIENT_SECRET,
    adminUsername: environment.KEYCLOAK_ADMIN_USERNAME,
    adminPassword: environment.KEYCLOAK_ADMIN_PASSWORD,
  };
}

export async function publicRealmDefinition(settings) {
  const standard = await standardDefinition(settings);
  for (const resource of [standard.client, ...standard.scopes]) {
    resource.attributes[ownerAttribute] = publicOwner;
  }
  return {
    realm: publicRealmName,
    enabled: true,
    displayName: 'Auth Protocol Playground',
    sslRequired: 'all',
    registrationAllowed: false,
    resetPasswordAllowed: false,
    rememberMe: false,
    editUsernameAllowed: false,
    verifyEmail: false,
    accessTokenLifespan: 300,
    bruteForceProtected: true,
    permanentLockout: false,
    failureFactor: 5,
    waitIncrementSeconds: 60,
    maxFailureWaitSeconds: 900,
    attributes: { [ownerAttribute]: publicOwner, frontendUrl: publicOrigin },
    clients: [standard.client],
    clientScopes: standard.scopes,
  };
}

export async function verifyPublicRealm(api, definition) {
  const actual = await api('');
  const { clients, clientScopes, ...realmSettings } = definition;
  requireCondition(
    owns(actual, publicOwner) && matchesFields(actual, realmSettings),
    'Public realm configuration conflicts with the owned definition',
  );
  const standard = { client: clients[0], scopes: clientScopes };
  const resources = await readStandardResources(api, standard);
  for (let index = 0; index < clientScopes.length; index += 1) {
    requireCondition(
      owns(resources.scopes[index], publicOwner) &&
        matchesFields(resources.scopes[index], clientScopes[index]),
      'Public client scope conflicts with the owned definition',
    );
  }
  await verifyStandardClient(api, standard, resources, publicOwner);
  const realmClients = await api('/clients');
  requireCondition(
    realmClients.every((client) => !unusedBrowserClients.has(client.clientId) || !client.enabled),
    'An unused public realm browser client is enabled',
  );
  const profile = await api('/users/profile');
  requireCondition(
    profile.attributes.some((attribute) => matchesFields(attribute, accountOwnerAttribute)),
    'The administrator-only demo ownership attribute is missing or unsafe',
  );
}

export async function configurePublicRealm({ settings, action = 'verify' }) {
  requireCondition(['apply', 'verify'].includes(action), 'Use apply or verify');
  const root = await adminApi(settings, null);
  const realms = await root('');
  const existing = realms.find((realm) => realm.realm === publicRealmName);
  const definition = await publicRealmDefinition(settings);
  const api = (path, method, body) => root(`/${publicRealmName}${path}`, method, body);
  if (!existing) {
    requireCondition(action === 'apply', 'The owned public realm is absent');
    await root('', 'POST', definition);
    const clients = await api('/clients');
    for (const client of clients) {
      if (unusedBrowserClients.has(client.clientId) && client.enabled) {
        await api(`/clients/${client.id}`, 'PUT', { ...client, enabled: false });
      }
    }
    // Keycloak 26 drops undeclared user attributes. Declare only the ownership
    // marker, editable/viewable by administrators; preserve its built-in profile.
    const profile = await api('/users/profile');
    await api('/users/profile', 'PUT', {
      ...profile,
      attributes: [...profile.attributes, accountOwnerAttribute],
    });
  }
  // Existing resources are verified, never overwritten or implicitly adopted/rotated.
  await verifyPublicRealm(api, definition);
  return { status: existing ? 'unchanged' : 'created', realm: publicRealmName };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    requireCondition(process.argv.length === 3, 'Usage: public-realm.mjs apply|verify');
    console.info(
      JSON.stringify(
        await configurePublicRealm({ settings: publicRealmSettings(), action: process.argv[2] }),
      ),
    );
  } catch {
    console.error('Public realm verification failed; inspect private configuration/connectivity.');
    process.exitCode = 1;
  }
}
