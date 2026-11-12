import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  privateUrl,
  requireCondition,
  standardClientId,
  standardSettings,
} from './standard-client.mjs';

function randomValue() {
  return randomBytes(32).toString('base64url');
}

export async function verifyStandardFlow(settings, env = process.env, secrets = new Set()) {
  const issuer = `${settings.server}/realms/epa-demo`;
  const metadataResponse = await fetch(`${issuer}/.well-known/openid-configuration`, {
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  requireCondition(metadataResponse.ok, 'Discovery failed');
  const metadata = await metadataResponse.json();
  for (const name of [
    'issuer',
    'authorization_endpoint',
    'token_endpoint',
    'jwks_uri',
    'pushed_authorization_request_endpoint',
  ]) {
    privateUrl(metadata[name]);
  }
  const checks = [];
  const remember = (value) => {
    if (typeof value === 'string' && value.length > 12) {
      secrets.add(value);
    }
    return value;
  };
  for (const value of [
    settings.secret,
    settings.adminPassword,
    env.OIDC_CLIENT_SECRET,
    env.TEST_USER_PASSWORD,
  ]) {
    remember(value);
  }
  async function call(url, options = {}) {
    return fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(10000) });
  }
  function expect(condition, name) {
    requireCondition(condition, `Verification failed: ${name}`);
    checks.push(name);
  }
  function transaction(scope = 'openid demo.fhir.read', clientId = standardClientId) {
    const verifier = remember(randomValue());
    const state = remember(randomValue());
    const nonce = remember(randomValue());
    const url = new URL(metadata.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri:
        clientId === standardClientId ? settings.callback : env.OIDC_DEFAULT_REDIRECT_URI,
      scope,
      state,
      nonce,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    return { url, verifier, state, nonce };
  }
  async function loginForm(initialUrl) {
    const cookies = new Map();
    let url = initialUrl;
    let response;
    for (let count = 0; count < 6; count += 1) {
      response = await call(url, {
        headers: { cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') },
      });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0];
        const separator = pair.indexOf('=');
        cookies.set(pair.slice(0, separator), remember(pair.slice(separator + 1)));
      }
      if (![302, 303].includes(response.status)) {
        break;
      }
      const next = new URL(response.headers.get('location'), url);
      requireCondition(
        next.origin === new URL(metadata.issuer).origin,
        'Unexpected login redirect origin',
      );
      await response.body?.cancel();
      url = next;
    }
    return { response, url, cookies };
  }
  async function authorize(flow) {
    const { response, url, cookies } = await loginForm(flow.url);
    requireCondition(response?.status === 200, 'Keycloak did not return a login form');
    const html = await response.text();
    const action = html.match(/<form[^>]*\baction="([^"]+)"/i)?.[1]?.replaceAll('&amp;', '&');
    requireCondition(action, 'Keycloak login form has no action');
    const actionUrl = new URL(action, url);
    requireCondition(
      actionUrl.origin === new URL(metadata.issuer).origin,
      'Unexpected login form origin',
    );
    const login = await call(actionUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      },
      body: new URLSearchParams({
        username: env.KEYCLOAK_VERIFICATION_USERNAME ?? 'demo-versicherte',
        password: env.TEST_USER_PASSWORD,
        credentialId: '',
      }),
    });
    requireCondition(
      login.status === 302 || login.status === 303,
      'Keycloak login did not complete',
    );
    const callback = new URL(login.headers.get('location'));
    const expected = new URL(settings.callback);
    requireCondition(
      callback.origin === expected.origin && callback.pathname === expected.pathname,
      `Unexpected callback destination: ${callback.origin}${callback.pathname}; action=${/^[A-Z_]{1,50}$/.test(callback.searchParams.get('execution') ?? '') ? callback.searchParams.get('execution') : 'unavailable'}`,
    );
    requireCondition(callback.searchParams.get('state') === flow.state, 'Callback state mismatch');
    requireCondition(
      callback.searchParams.has('code') && !callback.searchParams.has('error'),
      'Authorization did not return a code',
    );
    await login.body?.cancel();
    return remember(callback.searchParams.get('code'));
  }
  async function exchange(flow, code, { verifier = flow.verifier, secret = settings.secret } = {}) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: settings.callback,
    });
    if (verifier !== null) {
      body.set('code_verifier', verifier);
    }
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };
    if (secret === null) {
      body.set('client_id', standardClientId);
    } else {
      headers.authorization = `Basic ${Buffer.from(`${standardClientId}:${secret}`).toString('base64')}`;
    }
    const response = await call(metadata.token_endpoint, { method: 'POST', headers, body });
    const result = await response.json();
    remember(result.access_token);
    remember(result.id_token);
    remember(result.refresh_token);
    return { status: response.status, result };
  }
  const jwksResponse = await call(metadata.jwks_uri);
  requireCondition(jwksResponse.ok, 'JWKS request failed');
  const keys = (await jwksResponse.json()).keys;
  function claims(token) {
    requireCondition(typeof token === 'string', 'Expected a signed token');
    const parts = token.split('.');
    requireCondition(parts.length === 3, 'Expected a signed JWT');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const candidates = keys.filter(
      (key) => key.kid === header.kid && key.use === 'sig' && key.kty === 'RSA',
    );
    requireCondition(
      header.alg === 'RS256' && candidates.length === 1,
      'Unexpected signing key/algorithm',
    );
    requireCondition(
      verify(
        'RSA-SHA256',
        Buffer.from(`${parts[0]}.${parts[1]}`),
        createPublicKey({ key: candidates[0], format: 'jwk' }),
        Buffer.from(parts[2], 'base64url'),
      ),
      'JWT signature verification failed',
    );
    const value = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const now = Date.now() / 1000;
    requireCondition(
      value.iss === metadata.issuer &&
        value.exp > now &&
        value.iat <= now &&
        (value.nbf === undefined || value.nbf <= now),
      'JWT issuer/lifetime verification failed',
    );
    return value;
  }
  const audience = (value) => (typeof value === 'string' ? [value] : (value ?? []));

  for (const scope of ['openid demo.fhir.read', 'openid']) {
    const flow = transaction(scope);
    expect(
      !flow.url.searchParams.has('request_uri'),
      'standard authorization uses no PAR reference',
    );
    expect(
      !flow.url.href.includes(settings.secret) && !flow.url.href.includes(flow.verifier),
      'client secret and verifier are absent from browser authorization URL',
    );
    const code = await authorize(flow);
    const exchanged = await exchange(flow, code);
    expect(exchanged.status === 200, `authorization code exchange succeeds (${scope})`);
    const access = claims(exchanged.result.access_token);
    const identity = claims(exchanged.result.id_token);
    expect(
      audience(access.aud).includes('playground-fhir') &&
        access.azp === standardClientId &&
        access.typ === 'Bearer',
      'Access Token has resource audience, authorized client and bearer purpose',
    );
    const hasPermission = (access.scope ?? '').split(' ').includes('demo.fhir.read');
    expect(
      hasPermission === scope.includes('demo.fhir.read'),
      scope === 'openid'
        ? 'narrow grant omits resource permission while retaining audience'
        : 'requested resource permission is present',
    );
    expect(
      JSON.stringify(audience(identity.aud)) === JSON.stringify([standardClientId]) &&
        identity.nonce === flow.nonce,
      'ID Token has only the client audience and matching nonce',
    );
    const replay = await exchange(flow, code);
    expect(
      replay.status === 400 && replay.result.error === 'invalid_grant',
      'authorization code replay is rejected',
    );
  }
  for (const kind of ['missing-challenge', 'missing-method', 'plain', 'invalid-method']) {
    const flow = transaction();
    if (kind === 'missing-challenge') {
      flow.url.searchParams.delete('code_challenge');
      flow.url.searchParams.delete('code_challenge_method');
    } else if (kind === 'missing-method') {
      flow.url.searchParams.delete('code_challenge_method');
    } else {
      flow.url.searchParams.set('code_challenge_method', kind === 'plain' ? 'plain' : 'S512');
    }
    const response = await call(flow.url);
    const location = response.headers.get('location');
    const rejected =
      response.status === 400 ||
      (location && new URL(location).searchParams.get('error') === 'invalid_request');
    expect(Boolean(rejected), `PKCE ${kind} is rejected before login`);
    await response.body?.cancel();
  }
  for (const kind of ['wrong-verifier', 'missing-verifier', 'missing-secret', 'wrong-secret']) {
    const flow = transaction();
    const code = await authorize(flow);
    const options = {};
    if (kind === 'wrong-verifier') options.verifier = remember(randomValue());
    if (kind === 'missing-verifier') options.verifier = null;
    if (kind === 'missing-secret') options.secret = null;
    if (kind === 'wrong-secret') options.secret = remember(randomValue());
    const result = await exchange(flow, code, options);
    const noTokens = ['access_token', 'id_token', 'refresh_token'].every(
      (name) => result.result[name] === undefined,
    );
    expect(
      noTokens &&
        (kind.includes('secret')
          ? result.status === 401 &&
            ['invalid_client', 'unauthorized_client'].includes(result.result.error)
          : result.status === 400 && result.result.error === 'invalid_grant'),
      `${kind} is rejected at token exchange (HTTP ${result.status}, OAuth ${/^[a-z_]{1,40}$/.test(result.result.error ?? '') ? result.result.error : 'unavailable'})`,
    );
  }
  const wrongRedirect = transaction();
  wrongRedirect.url.searchParams.set('redirect_uri', `${settings.callback}/unregistered`);
  const invalidRedirectResponse = await call(wrongRedirect.url);
  expect(invalidRedirectResponse.status === 400, 'unregistered callback is rejected');
  await invalidRedirectResponse.body?.cancel();

  for (const grantType of ['password', 'client_credentials']) {
    const response = await call(metadata.token_endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${standardClientId}:${settings.secret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: grantType,
        username: env.KEYCLOAK_VERIFICATION_USERNAME ?? 'demo-versicherte',
        password: env.TEST_USER_PASSWORD,
      }),
    });
    const result = await response.json();
    expect(
      [400, 401].includes(response.status) && result.error === 'unauthorized_client',
      `${grantType} grant is disabled`,
    );
  }
  const epa = transaction('openid', env.OIDC_CLIENT_ID);
  const bypass = await call(epa.url);
  expect(bypass.status === 400, 'existing ePA client rejects authorization without PAR');
  await bypass.body?.cancel();
  const par = await call(metadata.pushed_authorization_request_endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${Buffer.from(`${env.OIDC_CLIENT_ID}:${env.OIDC_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: epa.url.searchParams,
  });
  requireCondition(par.status === 201, 'Existing ePA PAR request failed');
  const reference = remember((await par.json()).request_uri);
  const epaLogin = new URL(metadata.authorization_endpoint);
  epaLogin.search = new URLSearchParams({
    client_id: env.OIDC_CLIENT_ID,
    request_uri: reference,
  }).toString();
  const { response: form } = await loginForm(epaLogin);
  expect(
    form.status === 200 && (await form.text()).includes('id="kc-form-login"'),
    'existing ePA client accepts genuine PAR and opens login',
  );
  return { passed: checks.length, checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyStandardFlow(standardSettings());
    console.info(JSON.stringify(result, null, 2));
  } catch {
    console.error(
      'Keycloak flow verification failed; use the isolated verifier for safe diagnostic names',
    );
    process.exitCode = 1;
  }
}
