import { test, expect } from '@playwright/test';

const BASE = 'https://barbote-app-production.up.railway.app';
const EMAIL = 'admin@barbote.local';
const PASSWORD = 'admin123';

async function login(page: any) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
}

test.describe('Page Assemblage IA', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('charge sans erreur JS critique', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', err => {
      // Ignore chrome extension errors
      if (!err.message.includes('chrome-extension')) {
        jsErrors.push(err.message);
      }
    });

    await page.goto(`${BASE}/assemblage`);
    await page.waitForLoadState('networkidle');

    // Filter only the specific crashes we fixed
    const critical = jsErrors.filter(e =>
      e.includes("Cannot read properties of undefined (reading 'length')") ||
      e.includes("Cannot read properties of undefined (reading 'replace')")
    );
    expect(critical, `Erreurs JS critiques: ${critical.join(', ')}`).toHaveLength(0);
  });

  test('affiche les plans assemblage', async ({ page }) => {
    await page.goto(`${BASE}/assemblage`);
    await page.waitForLoadState('networkidle');

    // Should show plan cards OR empty state — not a blank page
    const hasPlanCards = await page.locator('[data-testid="plan-card"], .cursor-pointer.rounded-xl').count() > 0;
    const hasEmptyState = await page.getByText("Créez votre premier plan").isVisible().catch(() => false);
    const hasStats = await page.getByText('Plans créés').isVisible().catch(() => false);

    expect(hasPlanCards || hasEmptyState || hasStats).toBe(true);
  });

  test('ouvre le modal de détail d\'un plan', async ({ page }) => {
    await page.goto(`${BASE}/assemblage`);
    await page.waitForLoadState('networkidle');

    const cards = page.locator('.cursor-pointer.rounded-xl.border');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, 'Aucun plan disponible');
      return;
    }

    // Click first plan card
    await cards.first().click();

    // Modal should appear
    await expect(page.locator('.fixed.inset-0')).toBeVisible({ timeout: 5000 });

    // Should show "Scénarios" or plan name
    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toContainText(/scénario|Scénario|Volume/i);
  });

  test('affiche les scénarios dans le modal sans crash', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', err => {
      if (!err.message.includes('chrome-extension')) jsErrors.push(err.message);
    });

    await page.goto(`${BASE}/assemblage`);
    await page.waitForLoadState('networkidle');

    const cards = page.locator('.cursor-pointer.rounded-xl.border');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, 'Aucun plan disponible');
      return;
    }

    // Find a card with "Prêt" badge (scenarios_ready)
    let clickedReady = false;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const cardText = await cards.nth(i).textContent() ?? '';
      if (cardText.includes('Prêt') || cardText.includes('scénario')) {
        await cards.nth(i).click();
        clickedReady = true;
        break;
      }
    }

    if (!clickedReady) await cards.first().click();

    await page.waitForTimeout(500);

    // No critical crashes after opening modal
    const critical = jsErrors.filter(e =>
      e.includes("Cannot read properties of undefined") ||
      e.includes("is not a function")
    );
    expect(critical, `Crashes JS: ${critical.join('\n')}`).toHaveLength(0);
  });

  test('bouton "Nouveau plan IA" ouvre le formulaire', async ({ page }) => {
    await page.goto(`${BASE}/assemblage`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Nouveau plan IA/i }).click();

    // Creation modal should be visible
    await expect(page.getByText("Nouveau plan d'assemblage IA")).toBeVisible({ timeout: 5000 });
    // Check form inputs are present
    await expect(page.getByPlaceholder(/10 000/i).or(page.locator('input[type="number"]').first())).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Lots candidats/i).first()).toBeVisible();
  });

  test('liste les lots actifs dans le formulaire de création', async ({ page }) => {
    await page.goto(`${BASE}/assemblage`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Nouveau plan IA/i }).click();
    await page.waitForTimeout(1000);

    // Should show at least one lot in the checkbox list
    const lotLabels = page.locator('input[type="checkbox"]');
    const count = await lotLabels.count();
    expect(count).toBeGreaterThan(0);
  });

  test('assets CSS/JS chargés avec bon MIME type', async ({ page }) => {
    const failedAssets: string[] = [];

    page.on('response', response => {
      const url = response.url();
      if ((url.includes('/assets/') && url.endsWith('.css')) ||
          (url.includes('/assets/') && url.endsWith('.js'))) {
        const ct = response.headers()['content-type'] ?? '';
        if (ct.includes('text/html')) {
          failedAssets.push(`${url} → ${ct}`);
        }
      }
    });

    await page.goto(`${BASE}/assemblage`);
    await page.waitForLoadState('networkidle');

    expect(failedAssets, `Assets servis avec HTML: ${failedAssets.join(', ')}`).toHaveLength(0);
  });
});
