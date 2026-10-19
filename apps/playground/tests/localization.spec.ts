import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import deMission from '../src/locales/de/mission.json' with { type: 'json' };
import enMission from '../src/locales/en/mission.json' with { type: 'json' };
import deFlow from '../src/locales/de/protocol-flow.json' with { type: 'json' };
import enFlow from '../src/locales/en/protocol-flow.json' with { type: 'json' };

const preferenceKey = 'auth-protocol-playground.locale';
const copy = { de: { mission: deMission, flow: deFlow }, en: { mission: enMission, flow: enFlow } };

async function chooseLanguage(page: Page, language: 'de' | 'en') {
  await page.getByRole('combobox').selectOption(language);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

async function inspectionState(page: Page) {
  return page.evaluate(() => ({
    route: location.pathname,
    checkpoint: [...document.querySelectorAll('.checkpoint')].findIndex(
      (entry) => entry.getAttribute('aria-pressed') === 'true',
    ),
    selectedEvent: document
      .querySelector('.interaction-target[aria-pressed="true"]')
      ?.getAttribute('data-event-id'),
    selectedActor: document
      .querySelector('.actor[aria-pressed="true"]')
      ?.getAttribute('data-actor-id'),
    highlighted: [...document.querySelectorAll('.actor.highlighted')].map((entry) =>
      entry.getAttribute('data-actor-id'),
    ),
    events: [...document.querySelectorAll('.interaction-target')].map((entry) =>
      entry.getAttribute('data-event-id'),
    ),
    scale: document.querySelector('output')?.textContent,
  }));
}

test('German default ignores English browser settings and keyboard choice persists on every route', async ({
  page,
}) => {
  await page.goto('/missions');
  expect(await page.evaluate(() => navigator.language)).toMatch(/^en/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Verstehe den Ablauf.');
  await expect(page).toHaveTitle('Missionskatalog · Auth Protocol Playground');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  const language = page.getByRole('combobox');
  await expect(language).toHaveAccessibleName('Sprache');
  await language.focus();
  await expect(language).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(language).toHaveValue('en');
  await expect(language).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Understand the flow.');
  await expect(page).toHaveTitle('Mission Catalog · Auth Protocol Playground');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  for (const path of [
    '/missions/oauth-oidc/workspace',
    '/missions/epa-concept/workspace',
    '/unknown',
    '/missions/unknown/workspace',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
    await chooseLanguage(page, 'de');
    await expect(page.getByRole('combobox', { name: 'Sprache' })).toBeVisible();
    if (path.includes('unknown')) {
      await expect(page).toHaveTitle('Seite nicht gefunden · Auth Protocol Playground');
      await expect(page.getByRole('link', { name: 'Zurück zu den Missionen' })).toBeVisible();
    }
    await chooseLanguage(page, 'en');
  }
  expect(
    await page.evaluate(() => ({
      local: Object.entries(localStorage),
      session: sessionStorage.length,
      cookies: document.cookie,
    })),
  ).toEqual({ local: [[preferenceKey, 'en']], session: 0, cookies: '' });
});

for (const value of ['', 'fr', 'en-US', 'DE', '<invalid>']) {
  test(`unsupported saved language ${JSON.stringify(value)} falls back to German on direct navigation`, async ({
    page,
  }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: preferenceKey,
      value,
    });
    await page.goto('/missions/oauth-oidc/workspace');
    await expect(page.getByRole('combobox', { name: 'Sprache' })).toHaveValue('de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByRole('button', { name: 'Beispiele laden' })).toBeVisible();
  });
}

for (const failure of ['read', 'write'] as const) {
  test(`denied storage ${failure} leaves German startup and in-memory switching usable`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((failure) => {
      if (failure === 'read') {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('Denied', 'SecurityError');
          },
        });
      } else {
        Storage.prototype.setItem = () => {
          throw new DOMException('Denied', 'SecurityError');
        };
      }
    }, failure);
    await page.goto('/missions');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await chooseLanguage(page, 'en');
    await page.getByRole('link', { name: 'Preview fixture' }).click();
    await expect(page.getByRole('button', { name: 'Load fixture samples' })).toBeVisible();
    await chooseLanguage(page, 'de');
    await expect(page.getByRole('button', { name: 'Beispiele laden' })).toBeVisible();
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => ({ session: sessionStorage.length, cookies: document.cookie })),
    ).toEqual({ session: 0, cookies: '' });
  });
}

test('switching preserves learning identity, evidence and synchronized inspection without protocol traffic', async ({
  page,
}) => {
  const errors: string[] = [];
  const unexpected: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('request', (request) => {
    if (
      ['fetch', 'xhr'].includes(request.resourceType()) ||
      new URL(request.url()).hostname !== '127.0.0.1'
    )
      unexpected.push(request.url());
  });
  await page.goto('/missions/oauth-oidc/workspace');
  await page.locator('.checkpoint').nth(1).click();
  await page.getByRole('button', { name: 'Beispiele laden', exact: true }).click();
  await page.locator('.timeline button').nth(2).click();
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  const before = await inspectionState(page);
  expect(before.selectedEvent).toBe('exchange-example');
  expect(before.scale).toBe('125%');
  await page.evaluate(() => {
    document.documentElement.dataset.documentIdentity = 'retained';
  });
  for (const language of ['en', 'de'] as const) {
    await chooseLanguage(page, language);
    expect(await inspectionState(page)).toEqual(before);
    expect(await page.locator('html').getAttribute('data-document-identity')).toBe('retained');
    await expect(page.locator('.inspector h4')).toHaveText(
      copy[language].mission.definitions.oauthOidc.events['exchange-example'].title,
    );
    await expect(page.locator('.inspector .evidence-fields')).toContainText('BFF');
    await expect(page.locator('.inspector .evidence-fields')).toContainText(
      copy[language].flow.channels.back,
    );
    await expect(page.locator('.workspace > .sr-only[role="status"]')).toHaveText(
      copy[language].mission.announcements.loaded,
    );
  }
  // Every event retains technical details, classification and direction through translation.
  for (let index = 0; index < 4; index++) {
    await page.locator('.timeline button').nth(index).click();
    const selected = await inspectionState(page);
    await chooseLanguage(page, 'en');
    const technical = await page.locator('.inspector .evidence-fields dd').allTextContents();
    await chooseLanguage(page, 'de');
    expect(await inspectionState(page)).toEqual(selected);
    const translated = await page.locator('.inspector .evidence-fields dd').allTextContents();
    for (const literal of ['code', 'S256', 'BFF', 'Access Token']) {
      expect(translated.includes(literal)).toBe(technical.includes(literal));
    }
    if (index === 1) {
      await expect(page.locator('.inspector .badge').first()).toHaveText('Nicht beobachtbar');
      await expect(
        page.locator('.interaction-path[data-kind="internal"] .communication-edge'),
      ).toHaveCount(0);
    }
    if (index === 3) {
      expect(translated).toContain('Nur synthetische Daten');
    }
  }
  await page.locator('.actor[data-actor-id="bff"]').click();
  const actorState = await inspectionState(page);
  await chooseLanguage(page, 'en');
  expect(await inspectionState(page)).toEqual(actorState);
  await expect(page.locator('.inspector h4')).toHaveText('NestJS BFF');
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.locator('.timeline button')).toHaveCount(4);
  await expect(page.locator('.checkpoint[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByLabel('Map zoom')).toHaveText('100%');
  await page.getByRole('button', { name: 'Replay explanation' }).click();
  await expect(page.locator('.interaction-target[aria-pressed="true"]')).toHaveAttribute(
    'data-event-id',
    'authorization-example',
  );
  await chooseLanguage(page, 'de');
  await expect(page.locator('.workspace > .sr-only[role="status"]')).toHaveText(
    deMission.announcements.replayed,
  );
  await page.getByRole('button', { name: 'Einpassen', exact: true }).click();
  await chooseLanguage(page, 'en');
  await expect(page.locator('.workspace > .sr-only[role="status"]')).toHaveText(
    enMission.announcements.fitted,
  );
  await page.goto('/missions/epa-concept/workspace');
  await page.locator('.checkpoint').nth(2).click();
  const conceptual = await inspectionState(page);
  await chooseLanguage(page, 'de');
  expect(await inspectionState(page)).toEqual(conceptual);
  await expect(page.locator('.timeline button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Beispiele laden|Load fixture/ })).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});

for (const language of ['de', 'en'] as const) {
  for (const width of [1366, 1024, 390, 320]) {
    test(`${language} readable layout and accessible states at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 760 ? 844 : 768 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/missions');
      await chooseLanguage(page, language);
      const text = copy[language];
      const scan = async () => {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(result.violations).toEqual([]);
      };
      await scan();
      await page.goto('/missions/oauth-oidc/workspace');
      await scan();
      await page
        .getByRole('button', {
          name: text.mission.definitions.oauthOidc.preview.loadLabel,
          exact: true,
        })
        .click();
      for (const index of [0, 2, 1]) {
        await page.locator('.timeline button').nth(index).click();
        await expect(page.locator('.inspector .metadata').first()).toHaveText(
          text.flow.inspector.selected,
        );
        await scan();
      }
      await page.locator('.actor[data-actor-id="bff"]').click();
      await scan();
      await page.goto('/missions/epa-concept/workspace');
      await scan();
      await page.goto('/unknown');
      await scan();
    });
  }
}
