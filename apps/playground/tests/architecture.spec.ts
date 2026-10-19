import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { expect, test } from '@playwright/test';

const sourceRoot = resolve('src');
const normalize = (filename: string) => filename.replaceAll('\\', '/');
const publicEntries = new Set([
  'features/mission/index.ts',
  'features/protocol-flow/index.ts',
  'features/protocol-flow/contracts.ts',
  'features/protocol-flow/selection.ts',
]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(filename);
    }
    return /\.tsx?$/.test(filename) ? [filename] : [];
  });
}

function allowsDependency(source: string, target: string, typeOnly: boolean) {
  if (source === 'main.tsx') {
    return target === 'app/App.tsx';
  }
  if (source.startsWith('app/')) {
    return target.startsWith('app/') || target === 'features/mission/index.ts';
  }
  const [, capability, layer] = source.split('/');
  const [, targetCapability, targetLayer] = target.split('/');
  if (!target.startsWith('features/')) {
    return false;
  }
  if (capability !== targetCapability) {
    if (capability !== 'mission' || targetCapability !== 'protocol-flow') {
      return false;
    }
    if (target === 'features/protocol-flow/contracts.ts') {
      return typeOnly;
    }
    return (
      (layer === 'ui' && target === 'features/protocol-flow/index.ts') ||
      (layer === 'application' && target === 'features/protocol-flow/selection.ts')
    );
  }
  if (publicEntries.has(source)) {
    if (source.endsWith('/contracts.ts')) {
      return targetLayer === 'domain' && typeOnly;
    }
    if (source.endsWith('/selection.ts')) {
      return targetLayer === 'application';
    }
    return targetLayer === 'ui' || (capability === 'mission' && targetLayer === 'application');
  }
  if (publicEntries.has(target)) {
    return false;
  }
  const allowedLayers: Record<string, readonly string[]> = {
    ui: ['ui', 'application', 'domain'],
    application: ['application', 'domain', 'data'],
    domain: ['domain'],
    data: ['data', 'domain'],
  };
  return allowedLayers[layer ?? '']?.includes(targetLayer ?? '') ?? false;
}

function findCycles(graph: ReadonlyMap<string, readonly string[]>) {
  const visited = new Set<string>();
  const active = new Set<string>();
  const cycles: string[][] = [];
  function visit(filename: string, trail: string[]) {
    if (active.has(filename)) {
      cycles.push([...trail, filename]);
      return;
    }
    if (visited.has(filename)) {
      return;
    }
    active.add(filename);
    for (const dependency of graph.get(filename) ?? []) {
      visit(dependency, [...trail, filename]);
    }
    active.delete(filename);
    visited.add(filename);
  }
  for (const filename of graph.keys()) {
    visit(filename, []);
  }
  return cycles;
}

test('production imports and re-exports follow capability boundaries without cycles', () => {
  const configFile = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd());
  const graph = new Map<string, string[]>();
  const violations: string[] = [];
  for (const filename of sourceFiles(sourceRoot)) {
    const source = normalize(relative(sourceRoot, filename));
    const ast = ts.createSourceFile(
      filename,
      readFileSync(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const dependencies: string[] = [];
    const checkImport = (specifier: string, typeOnly: boolean) => {
      if (source === 'main.tsx' && specifier === './styles.css') {
        return;
      }
      const resolved = ts.resolveModuleName(
        specifier,
        filename,
        config.options,
        ts.sys,
      ).resolvedModule;
      if (!resolved) {
        violations.push(`${source}: unresolved ${specifier}`);
        return;
      }
      if (resolved.isExternalLibraryImport) {
        if (
          source.includes('/domain/') ||
          source.endsWith('/contracts.ts') ||
          (source.startsWith('features/protocol-flow/') && specifier !== 'react')
        ) {
          violations.push(`${source}: prohibited external dependency ${specifier}`);
        }
        return;
      }
      const target = normalize(relative(sourceRoot, resolved.resolvedFileName));
      dependencies.push(target);
      if (!allowsDependency(source, target, typeOnly)) {
        violations.push(`${source} -> ${target}`);
      }
    };
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const bindings = node.importClause?.namedBindings;
        const typeOnly =
          node.importClause?.isTypeOnly ||
          (!node.importClause?.name &&
            bindings &&
            ts.isNamedImports(bindings) &&
            bindings.elements.length > 0 &&
            bindings.elements.every((entry) => entry.isTypeOnly));
        checkImport(node.moduleSpecifier.text, Boolean(typeOnly));
      }
      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const typeOnly =
          node.isTypeOnly ||
          (node.exportClause &&
            ts.isNamedExports(node.exportClause) &&
            node.exportClause.elements.length > 0 &&
            node.exportClause.elements.every((entry) => entry.isTypeOnly));
        checkImport(node.moduleSpecifier.text, Boolean(typeOnly));
      }
      if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        checkImport(node.argument.literal.text, true);
      }
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        const specifier = node.arguments[0];
        if (specifier && ts.isStringLiteral(specifier)) {
          checkImport(specifier.text, false);
        } else {
          violations.push(`${source}: unresolved dynamic dependency`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    graph.set(source, dependencies);
  }
  expect(graph.size).toBeGreaterThan(0);
  expect(violations).toEqual([]);
  expect(findCycles(graph)).toEqual([]);
});

test('canonical domain contracts compile without React or browser libraries', () => {
  const domainFiles = sourceFiles(sourceRoot).filter((filename) =>
    normalize(filename).includes('/domain/'),
  );
  const program = ts.createProgram(domainFiles, {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    types: [],
    lib: ['lib.es2022.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  expect(
    ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
  ).toEqual([]);

  const names = [
    'Actor',
    'ActorGroup',
    'EvidenceField',
    'MessageChannel',
    'InternalChannel',
    'InteractionChannel',
    'FixtureContent',
    'FixtureEvent',
    'Checkpoint',
    'MissionPreview',
    'Mission',
  ];
  const declarations = new Map<string, string[]>();
  for (const filename of sourceFiles(sourceRoot)) {
    const ast = ts.createSourceFile(
      filename,
      readFileSync(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const node of ast.statements) {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        declarations.set(node.name.text, [
          ...(declarations.get(node.name.text) ?? []),
          normalize(relative(sourceRoot, filename)),
        ]);
      }
    }
  }
  for (const name of names) {
    const owner = ['Checkpoint', 'MissionPreview', 'Mission'].includes(name)
      ? 'mission/domain/mission.ts'
      : 'protocol-flow/domain/protocol-flow.ts';
    expect(declarations.get(name), name).toEqual([`features/${owner}`]);
  }
});

test('architecture checks reject reverse edges, internal imports and cycles', () => {
  expect(
    allowsDependency(
      'features/mission/domain/mission.ts',
      'features/protocol-flow/contracts.ts',
      true,
    ),
  ).toBe(true);
  expect(
    allowsDependency('features/mission/domain/mission.ts', 'features/protocol-flow/index.ts', true),
  ).toBe(false);
  expect(
    allowsDependency(
      'features/protocol-flow/ui/Inspector.tsx',
      'features/mission/domain/mission.ts',
      true,
    ),
  ).toBe(false);
  expect(
    allowsDependency('features/mission/ui/Catalog.tsx', 'features/mission/data/registry.ts', false),
  ).toBe(false);
  expect(
    allowsDependency(
      'features/mission/application/useMissionWorkspace.ts',
      'features/protocol-flow/application/useProtocolSelection.ts',
      false,
    ),
  ).toBe(false);
  expect(
    findCycles(
      new Map([
        ['one', ['two']],
        ['two', ['one']],
      ]),
    ),
  ).toHaveLength(1);
  expect(
    findCycles(
      new Map([
        ['one', ['two']],
        ['two', []],
      ]),
    ),
  ).toEqual([]);
});
