import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const preferenceKey = 'auth-protocol-playground.locale';

async function chooseLanguage(page: Page, language: 'de' | 'en') {
  await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption(language);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
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
  const language = page.getByRole('combobox', { name: /^(Language|Sprache)$/ });
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
    await expect(page.getByRole('button', { name: 'Simulation starten' })).toBeVisible();
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
    await page.getByRole('link', { name: 'Start simulation', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Start simulation' })).toBeVisible();
    await chooseLanguage(page, 'de');
    await expect(page.getByRole('button', { name: 'Simulation starten' })).toBeVisible();
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => ({ session: sessionStorage.length, cookies: document.cookie })),
    ).toEqual({ session: 0, cookies: '' });
  });
}

test('language switching preserves simulated progress, selection and literal evidence without protocol traffic', async ({
  page,
}) => {
  const traffic: string[] = [];
  page.on('request', (request) => {
    if (['fetch', 'xhr'].includes(request.resourceType())) {
      traffic.push(request.url());
    }
  });
  await page.goto('/missions/oauth-oidc/workspace?execution=simulation&mode=inspect');
  await page.locator('[data-runtime-action="start"]').click();
  for (let index = 0; index < 5; index += 1) {
    await page.locator('[data-runtime-action="advance"]').click();
  }
  await page.locator('.timeline button').first().click();
  await page.locator('.evidence-section summary').click();
  const before = await page
    .locator('.timeline [aria-pressed="true"]')
    .getAttribute('data-event-id');
  for (const language of ['en', 'de'] as const) {
    await chooseLanguage(page, language);
    await expect(page.locator('.timeline button')).toHaveCount(6);
    expect(
      await page.locator('.timeline [aria-pressed="true"]').getAttribute('data-event-id'),
    ).toBe(before);
    await expect(page.locator('.inspector')).toContainText('S256');
    await expect(page.locator('.inspector')).toContainText(
      language === 'en' ? 'SIMULATED' : 'SIMULIERT',
    );
  }
  await page.goto('/missions/epa-concept/workspace?mode=inspect');
  await page.locator('[data-runtime-action="start"]').click();
  await chooseLanguage(page, 'en');
  await expect(page.locator('.timeline button')).toHaveCount(1);
  await expect(page.locator('[data-provenance="simulation"]')).toContainText('CONCEPTUAL');
  expect(traffic).toEqual([]);
});

for (const language of ['de', 'en'] as const) {
  for (const width of [1366, 1024, 390, 320]) {
    test(`${language} readable layout and accessible states at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 760 ? 844 : 768 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/missions');
      await chooseLanguage(page, language);
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
      await page.locator('[data-runtime-action="start"]').first().click();
      for (let index = 0; index < 3; index += 1) {
        await page.locator('[data-runtime-action="advance"]').first().click();
      }
      await page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true }).click();
      for (const index of [0, 2, 1]) {
        await page.locator('.timeline button').nth(index).click();
        await expect(page.locator('.inspector')).toContainText(
          language === 'en' ? 'SIMULATED' : 'SIMULIERT',
        );
        await scan();
      }

      await page.goto('/missions/epa-concept/workspace');
      await scan();
      await page.goto('/unknown');
      await scan();
    });
  }
}
