import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInstance } from 'i18next';
import { expect, test } from '@playwright/test';
import ts from 'typescript';
import deCommon from '../src/locales/de/common.json' with { type: 'json' };
import deMission from '../src/locales/de/mission.json' with { type: 'json' };
import deFlow from '../src/locales/de/protocol-flow.json' with { type: 'json' };
import enCommon from '../src/locales/en/common.json' with { type: 'json' };
import enMission from '../src/locales/en/mission.json' with { type: 'json' };
import enFlow from '../src/locales/en/protocol-flow.json' with { type: 'json' };
import { missions } from '../src/features/mission/application/mission-catalog';

const resources = {
  de: { common: deCommon, mission: deMission, 'protocol-flow': deFlow },
  en: { common: enCommon, mission: enMission, 'protocol-flow': enFlow },
};

function leafValues(value: unknown, prefix = ''): Map<string, string> {
  if (typeof value === 'string') {
    return new Map([[prefix, value]]);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid resource entry: ${prefix}`);
  }
  const leaves = new Map<string, string>();
  for (const [key, child] of Object.entries(value)) {
    for (const [path, text] of leafValues(child, prefix ? `${prefix}.${key}` : key)) {
      leaves.set(path, text);
    }
  }
  return leaves;
}

function parameters(text: string) {
  return [...text.matchAll(/{{\s*([^},\s]+)(?:,[^}]*)?}}/g)].map((match) => match[1]).sort();
}

function resourceIssues(german: unknown, english: unknown) {
  const de = leafValues(german);
  const en = leafValues(english);
  const issues: string[] = [];
  for (const key of new Set([...de.keys(), ...en.keys()])) {
    for (const [locale, values] of [
      ['de', de],
      ['en', en],
    ] as const) {
      const text = values.get(key);
      if (!text?.trim()) {
        issues.push(`${locale}:${key}: missing or blank`);
        continue;
      }
      if (key.endsWith('_one') && !values.has(key.replace(/_one$/, '_other'))) {
        issues.push(`${locale}:${key}: missing plural other`);
      }
      if (key.endsWith('_other') && !values.has(key.replace(/_other$/, '_one'))) {
        issues.push(`${locale}:${key}: missing plural one`);
      }
    }
    if (
      JSON.stringify(parameters(de.get(key) ?? '')) !==
      JSON.stringify(parameters(en.get(key) ?? ''))
    ) {
      issues.push(`en:${key}: interpolation mismatch`);
    }
  }
  return issues;
}

function qualifiedLeaves(locale: 'de' | 'en') {
  const leaves = new Map<string, string>();
  for (const [namespace, dictionary] of Object.entries(resources[locale])) {
    for (const [key, text] of leafValues(dictionary)) {
      leaves.set(`${namespace}:${key}`, text);
    }
  }
  return leaves;
}

function referenceExists(reference: string, locale: 'de' | 'en') {
  const leaves = qualifiedLeaves(locale);
  return (
    leaves.has(reference) || (leaves.has(`${reference}_one`) && leaves.has(`${reference}_other`))
  );
}

function contentReferences(value: unknown): string[] {
  if (typeof value === 'string') {
    return /^(common|mission|protocol-flow):/.test(value) ? [value] : [];
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.values(value).flatMap(contentReferences);
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

test('all released namespaces, keys, interpolation and plural forms are complete', async () => {
  expect(Object.keys(resources.de).sort()).toEqual(['common', 'mission', 'protocol-flow']);
  expect(Object.keys(resources.en).sort()).toEqual(Object.keys(resources.de).sort());
  expect(resourceIssues(resources.de, resources.en)).toEqual([]);
  const i18n = createInstance();
  await i18n.init({ lng: 'de', fallbackLng: 'de', resources });
  for (const language of ['de', 'en']) {
    for (const count of [0, 1, 2]) {
      const text = i18n.t('mission:catalog.previewCount', { lng: language, count });
      expect(text).toContain(String(count));
      expect(text).not.toContain('{{');
      expect(text).not.toContain('previewCount');
    }
  }
  // Static HTML metadata is a German bootstrap copy of the resource source of truth.
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain('<html lang="de">');
  expect(html).toContain(deCommon.description);
  expect(html).toContain(`<title>${deCommon.titles.catalog}</title>`);
});

test('all mission and static UI content references resolve without relying on fallback', () => {
  const references = contentReferences(missions);
  const inlineCopy: string[] = [];
  const allowedText = new Set(['AUTH PROTOCOL PLAYGROUND', 'Auth Protocol Playground', 'i']);
  for (const filename of sourceFiles('src')) {
    const code = readFileSync(filename, 'utf8');
    const namespace = code.match(/useTranslation\('([^']+)'\)/)?.[1];
    const ast = ts.createSourceFile(
      filename,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function collectKey(node: ts.Node) {
      if (ts.isStringLiteral(node)) {
        references.push(node.text.includes(':') ? node.text : `${namespace}:${node.text}`);
      } else if (ts.isConditionalExpression(node)) {
        collectKey(node.whenTrue);
        collectKey(node.whenFalse);
      }
    }
    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) && /^(common|mission|protocol-flow):/.test(node.text)) {
        references.push(node.text);
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 't'
      ) {
        const key = node.arguments[0];
        if (key) {
          collectKey(key);
        }
      }
      if (ts.isJsxText(node)) {
        const text = node.text.replace(/\s+/g, ' ').trim();
        if (/[A-Za-zÃ„Ã–ÃœÃ¤Ã¶Ã¼ÃŸ]/.test(text) && !allowedText.has(text)) {
          inlineCopy.push(`${filename}: ${text}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  expect(inlineCopy).toEqual([]);
  expect(references.length).toBeGreaterThan(150);
  for (const locale of ['de', 'en'] as const) {
    const missing = [...new Set(references)].filter((key) => !referenceExists(key, locale));
    expect(missing, locale).toEqual([]);
    expect(referenceExists('mission:definitions.unknown.title', locale)).toBe(false);
  }
});

test('incomplete resources fail quality checks while runtime English fallback remains German', async () => {
  expect(resourceIssues({ greeting: 'Hallo {{name}}' }, {})).toContain(
    'en:greeting: missing or blank',
  );
  expect(resourceIssues({ common: { greeting: 'Hallo' } }, {})).toContain(
    'en:common.greeting: missing or blank',
  );
  expect(resourceIssues({ greeting: 'Hallo' }, { greeting: ' ' })).toContain(
    'en:greeting: missing or blank',
  );
  expect(resourceIssues({ greeting: 'Hallo {{name}}' }, { greeting: 'Hello {{user}}' })).toContain(
    'en:greeting: interpolation mismatch',
  );
  expect(resourceIssues({ count_one: 'Ein Beispiel' }, { count_one: 'One example' })).toContain(
    'de:count_one: missing plural other',
  );
  const i18n = createInstance();
  await i18n.init({
    lng: 'en',
    fallbackLng: 'de',
    defaultNS: 'common',
    resources: { de: { common: { greeting: 'Hallo {{name}}' } }, en: { common: {} } },
  });
  expect(i18n.t('greeting', { name: '<Ada>' })).toBe('Hallo &lt;Ada&gt;');
  expect(i18n.language).toBe('en');
});

test('content migration keeps fixture structure, classifications and technical evidence literal', () => {
  const mission = missions.find((entry) => entry.id === 'oauth-oidc');
  expect(mission?.preview.kind).toBe('fixture');
  if (mission?.preview.kind !== 'fixture') {
    throw new Error('Expected fixture mission');
  }
  const events = mission.preview.events;
  expect(events.map((event) => event.id)).toEqual([
    'authorization-example',
    'provider-internal-example',
    'exchange-example',
    'resource-example',
  ]);
  const literals = events.flatMap((event) =>
    event.evidence.flatMap((field) => (field.value.kind === 'literal' ? [field.value.value] : [])),
  );
  expect(literals).toEqual(['code', 'S256', 'BFF', 'Access Token']);
  expect(events[1]).toMatchObject({
    kind: 'internal',
    actorId: 'authorization-server',
    visibility: 'not-observable',
  });
  expect(missions.find((entry) => entry.id === 'epa-concept')?.preview.kind).toBe('concept');
});
