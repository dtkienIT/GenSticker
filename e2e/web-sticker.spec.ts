import { expect, test } from '@playwright/test';

test('shows a WebGPU requirement after an unsupported mock capability', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Diagnostics' }).click();
  await page.getByText('unsupported', { exact: true }).click();
  await page.goBack();

  await expect(
    page.getByText(/does not meet the current local generation requirements/i),
  ).toBeVisible();
});

test('uses the local project model source in development configuration', async ({ page }) => {
  await page.goto('/debug');

  await expect(page.getByText('Model source: local')).toBeVisible();
});

test('persists a mocked generated sticker after reload', async ({ page }) => {
  await page.goto('/');
  await page
    .getByPlaceholder('A cheerful astronaut cat holding boba')
    .fill('A cheerful astronaut cat holding boba');
  await page.getByRole('button', { name: 'Generate on this device' }).click();
  await expect(page.getByText('Transparent PNG ready')).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await page.goto('/library');

  await expect(page.getByText('A cheerful astronaut cat holding boba')).toBeVisible();
});

test('reloads the production shell while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText('Describe your sticker')).toBeVisible();
});
