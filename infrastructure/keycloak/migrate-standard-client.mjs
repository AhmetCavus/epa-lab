import { chmod, lstat, readFile, rename, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  adminApi,
  matchesFields,
  owns,
  readStandardResources,
  realmName,
  requireCondition,
  standardClientId,
  standardDefinition,
  standardSettings,
  verifyStandardClient,
} from './standard-client.mjs';

async function saveJournal(path, journal) {
  const temporary = `${path}.pending`;
  await writeFile(temporary, `${JSON.stringify(journal, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  await rename(temporary, path);
}

async function openJournal(path, settings) {
  const empty = {
    version: 1,
    server: settings.server,
    realm: realmName,
    callback: settings.callback,
    clientId: standardClientId,
    created: { client: null, scopes: [] },
    rolledBack: false,
  };
  try {
    await writeFile(path, `${JSON.stringify(empty, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
  requireCondition((await lstat(path)).isFile(), 'Migration journal must be a regular file');
  await chmod(path, 0o600);
  const journal = JSON.parse(await readFile(path, 'utf8'));
  for (const key of ['version', 'server', 'realm', 'callback', 'clientId']) {
    requireCondition(
      journal[key] === empty[key],
      'Migration journal belongs to another configuration',
    );
  }
  return journal;
}

async function preflight(api, definition) {
  // All conflicts are discovered before the first mutation; no realm-wide PUT/import is used.
  await api('');
  const resources = await readStandardResources(api, definition);
  for (let index = 0; index < definition.scopes.length; index += 1) {
    const existing = resources.scopes[index];
    requireCondition(
      !existing || (owns(existing) && matchesFields(existing, definition.scopes[index])),
      'Client scope name is already used by a conflicting configuration',
    );
  }
  if (resources.client) {
    await verifyStandardClient(api, definition, resources);
  }
  return resources;
}

async function apply(api, definition, journal, path) {
  requireCondition(!journal.rolledBack, 'Use a new journal after a completed rollback');
  let resources = await preflight(api, definition);
  let created = 0;
  for (let index = 0; index < definition.scopes.length; index += 1) {
    if (resources.scopes[index]) {
      continue;
    }
    await api('/client-scopes', 'POST', definition.scopes[index]);
    resources = await readStandardResources(api, definition);
    const scope = resources.scopes[index];
    requireCondition(scope, 'Created client scope could not be read back');
    journal.created.scopes.push({ id: scope.id, name: scope.name });
    await saveJournal(path, journal);
    created += 1;
  }
  if (!resources.client) {
    await api('/clients', 'POST', definition.client);
    resources = await readStandardResources(api, definition);
    requireCondition(resources.client, 'Created standard client could not be read back');
    journal.created.client = resources.client.id;
    await saveJournal(path, journal);
    for (const kind of ['default', 'optional']) {
      const assigned = await api(`/clients/${resources.client.id}/${kind}-client-scopes`);
      const expected = definition.client[`${kind}ClientScopes`];
      for (const scope of assigned) {
        if (!expected.includes(scope.name)) {
          await api(`/clients/${resources.client.id}/${kind}-client-scopes/${scope.id}`, 'DELETE');
        }
      }
      for (const scope of resources.scopes) {
        if (expected.includes(scope.name) && !assigned.some((entry) => entry.id === scope.id)) {
          await api(`/clients/${resources.client.id}/${kind}-client-scopes/${scope.id}`, 'PUT');
        }
      }
    }
    created += 1;
  }
  resources = await preflight(api, definition);
  await verifyStandardClient(api, definition, resources);
  return { created, status: created ? 'applied' : 'unchanged' };
}

async function rollback(api, definition, journal, path) {
  if (journal.rolledBack) {
    return { status: 'already-rolled-back', removed: 0 };
  }
  const resources = await preflight(api, definition);
  if (journal.created.client) {
    requireCondition(
      resources.client?.id === journal.created.client,
      'Rollback client identity has changed',
    );
  }
  for (const scope of journal.created.scopes) {
    requireCondition(
      resources.scopes.some((entry) => entry?.id === scope.id && entry.name === scope.name),
      'Rollback scope identity has changed',
    );
  }
  for (let first = 0; ; first += 100) {
    const clients = await api(`/clients?first=${first}&max=100`);
    for (const client of clients) {
      if (client.id === journal.created.client) {
        continue;
      }
      for (const kind of ['default', 'optional']) {
        const assigned = await api(`/clients/${client.id}/${kind}-client-scopes`);
        requireCondition(
          !assigned.some((entry) => journal.created.scopes.some((scope) => scope.id === entry.id)),
          'Rollback refused: another client uses a created scope',
        );
      }
    }
    if (clients.length < 100) {
      break;
    }
  }
  if (journal.created.client) {
    await api(`/clients/${journal.created.client}`, 'DELETE');
  }
  for (const scope of journal.created.scopes) {
    await api(`/client-scopes/${scope.id}`, 'DELETE');
  }
  journal.rolledBack = true;
  await saveJournal(path, journal);
  return {
    status: 'rolled-back',
    removed: journal.created.scopes.length + Number(Boolean(journal.created.client)),
  };
}

export async function migrateStandardClient({ settings, stateFile, action = 'apply' }) {
  requireCondition(stateFile, 'An explicit private --state-file path is required');
  requireCondition(['apply', 'rollback'].includes(action), 'Use apply or rollback');
  const definition = await standardDefinition(settings);
  const api = await adminApi(settings);
  const journal = await openJournal(stateFile, settings);
  return action === 'apply'
    ? apply(api, definition, journal, stateFile)
    : rollback(api, definition, journal, stateFile);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [action, flag, stateFile, ...extra] = process.argv.slice(2);
    requireCondition(
      flag === '--state-file' && extra.length === 0,
      'Usage: apply|rollback --state-file /private/path.json',
    );
    console.info(
      JSON.stringify(
        await migrateStandardClient({ settings: standardSettings(), action, stateFile }),
      ),
    );
  } catch (error) {
    // Only our bounded operational messages are printed; network/provider details stay private.
    console.error(
      error instanceof Error && !error.cause
        ? error.message
        : 'Keycloak migration failed; check private configuration/connectivity',
    );
    process.exitCode = 1;
  }
}
