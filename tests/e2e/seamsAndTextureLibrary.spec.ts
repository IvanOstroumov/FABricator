import { test, expect } from '@playwright/test';

test('marks a seam on a selected edge and shows it in the viewport', async ({ page }) => {
  // The hardcoded edge coordinate assumes this viewport size — see
  // tests/e2e/loopCutBevel.spec.ts for the same landmark.
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();
  await page.locator('.hierarchy-row').first().click();

  const canvas = page.locator('.viewport3d');
  await canvas.click();
  await page.keyboard.press('3'); // edge mode
  await page.mouse.click(514, 467);
  await expect(page.locator('.status-bar')).toContainText('Selection: 1');

  await page.getByText('UV', { exact: true }).click();
  await expect(page.getByText('Marca seam', { exact: true })).toBeEnabled();
  await page.getByText('Marca seam', { exact: true }).click();

  await page.keyboard.press('Control+z');
  expect(errors).toEqual([]);
});

test('imported textures show up as clickable thumbnails in the material library', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();
  await page.locator('.hierarchy-row').first().click();
  await page.locator('.materials-swatch--add').click();

  const fileInput = page.locator('input[type="file"]');
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  await fileInput.setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: pngBuffer });

  await expect(page.locator('.texture-thumb')).toHaveCount(1);
  await page.locator('.texture-thumb').click();

  expect(errors).toEqual([]);
});
