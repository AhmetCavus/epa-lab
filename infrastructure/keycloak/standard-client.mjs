import { readFile } from 'node:fs/promises';

export const realmName = 'epa-demo';
export const standardClientId = 'playground-oidc';
export const ownerAttribute = 'playground.managed-by';
export const ownerValue = '001-oidc-pkce';

export function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function privateUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Expected a private absolute URL');
  }
  const host = url.hostname;
  const parts = host.split('.').map(Number);
  const privateIpv4 =
    parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
    (parts[0] === 127 ||
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168));
  requireCondition(
    ['http:', 'https:'].includes(url.protocol) &&
      (host === 'localhost' || host === '[::1]' || privateIpv4) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash,
    'Only credential-free loopback/private lab URLs are accepted',
  );
  return url;
}

export function standardSettings(env = process.env) {
  const server = privateUrl(
    env.KEYCLOAK_ADMIN_URL ?? env.KEYCLOAK_HOSTNAME ?? 'http://localhost:8080',
  );
  requireCondition(server.pathname === '/', 'Keycloak admin URL must be an origin');
  requireCondition(
    (env.PLAYGROUND_OIDC_CLIENT_ID ?? standardClientId) === standardClientId,
    'The standard client ID must remain playground-oidc',
  );
  const callback = privateUrl(env.PLAYGROUND_OIDC_REDIRECT_URI);
  requireCondition(
    callback.pathname === '/api/oauth/callback',
    'Expected the exact mission callback path',
  );
  requireCondition(
    typeof env.PLAYGROUND_OIDC_CLIENT_SECRET === 'string' &&
      env.PLAYGROUND_OIDC_CLIENT_SECRET.length >= 32,
    'PLAYGROUND_OIDC_CLIENT_SECRET must contain at least 32 characters',
  );
  requireCondition(
    env.KEYCLOAK_ADMIN_USERNAME && env.KEYCLOAK_ADMIN_PASSWORD,
    'Keycloak admin credentials are required in the process environment',
  );
  return {
    server: server.origin,
    callback: callback.href,
    secret: env.PLAYGROUND_OIDC_CLIENT_SECRET,
    adminUsername: env.KEYCLOAK_ADMIN_USERNAME,
    adminPassword: env.KEYCLOAK_ADMIN_PASSWORD,
  };
}

export async function standardDefinition(settings) {
  const realm = JSON.parse(
    await readFile(new URL('./epa-demo-realm.json', import.meta.url), 'utf8'),
  );
  const client = realm.clients.find((entry) => entry.clientId === standardClientId);
  requireCondition(client, 'Standard client is absent from the fresh-realm configuration');
  const configured = structuredClone(client);
  configured.secret = settings.secret;
  configured.redirectUris = [settings.callback];
  return {
    client: configured,
    scopes: realm.clientScopes.filter((scope) => scope.attributes?.[ownerAttribute] === ownerValue),
  };
}

export async function adminApi(settings) {
  const response = await fetch(`${settings.server}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: 'admin-cli',
      grant_type: 'password',
      username: settings.adminUsername,
      password: settings.adminPassword,
    }),
  });
  requireCondition(
    response.ok,
    `Keycloak administrator authentication failed (HTTP ${response.status})`,
  );
  const token = (await response.json()).access_token;
  requireCondition(typeof token === 'string', 'Keycloak administrator response has no token');

  return async function request(path, method = 'GET', body) {
    const result = await fetch(`${settings.server}/admin/realms/${realmName}${path}`, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    // Never include server bodies, credentials or URLs containing protocol data in errors.
    requireCondition(result.ok, `Keycloak admin ${method} failed (HTTP ${result.status})`);
    if (result.status === 204 || result.status === 201) {
      await result.body?.cancel();
      return undefined;
    }
    return result.json();
  };
}

export function owns(resource) {
  return resource?.attributes?.[ownerAttribute] === ownerValue;
}

export function matchesFields(actual, expected) {
  return Object.entries(expected).every(([key, value]) => {
    if (key === 'secret' || key === 'defaultClientScopes' || key === 'optionalClientScopes') {
      return true;
    }
    if (key === 'attributes' || key === 'config') {
      return Object.entries(value).every(([name, setting]) => actual[key]?.[name] === setting);
    }
    if (key === 'protocolMappers') {
      return (
        (actual[key] ?? []).length === value.length &&
        value.every((mapper) =>
          (actual[key] ?? []).some((candidate) => matchesFields(candidate, mapper)),
        )
      );
    }
    return JSON.stringify(actual[key]) === JSON.stringify(value);
  });
}

export async function readStandardResources(api, definition) {
  const clients = await api(`/clients?clientId=${standardClientId}`);
  requireCondition(clients.length <= 1, 'Standard client lookup is ambiguous');
  const scopes = await api('/client-scopes');
  const client = clients[0] ? await api(`/clients/${clients[0].id}`) : undefined;
  return {
    client,
    scopes: definition.scopes.map((desired) => scopes.find((scope) => scope.name === desired.name)),
  };
}

export async function verifyStandardClient(api, definition, resources) {
  const client = resources.client;
  requireCondition(
    owns(client) && matchesFields(client, definition.client),
    'Standard client configuration conflicts with the managed definition',
  );
  const roles = await api(`/clients/${client.id}/roles`);
  requireCondition(
    !roles.some((role) => role.name === 'require-par'),
    'Standard client must not carry require-par',
  );
  const secret = await api(`/clients/${client.id}/client-secret`);
  requireCondition(
    secret.value === definition.client.secret,
    'Standard client secret differs; explicit rotation is required',
  );
  for (const kind of ['default', 'optional']) {
    const assigned = await api(`/clients/${client.id}/${kind}-client-scopes`);
    const names = assigned.map((scope) => scope.name).sort();
    const expected = [...definition.client[`${kind}ClientScopes`]].sort();
    requireCondition(
      JSON.stringify(names) === JSON.stringify(expected),
      'Standard client scope assignments conflict with the managed definition',
    );
  }
}
