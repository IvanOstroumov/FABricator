import { test, expect } from '@playwright/test';

test('unwraps a cube, toggles the checkerboard, and shows the UV layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();
  await page.locator('.hierarchy-row').first().click();

  const canvas = page.locator('.viewport3d');
  await canvas.click();

  await page.locator('.viewport-toolbar').getByText('Checkerboard', { exact: true }).click();
  await expect(page.locator('.viewport-toolbar').getByText('Checkerboard', { exact: true })).toHaveClass(/active/);

  await page.keyboard.press('u'); // automatic unwrap
  await page.getByText('Editor UV', { exact: true }).click();
  await expect(page.locator('.uv-editor__canvas')).toBeVisible();
  await expect(page.locator('.uv-editor__edge')).not.toHaveCount(0);

  await page.getByText('Viewport 3D', { exact: true }).click();
  await canvas.click();
  await page.keyboard.press('Control+z'); // undo the unwrap

  expect(errors).toEqual([]);
});

test('exports the scene to FBX from the File menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Sfera' }).click();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('File', { exact: true }).click().then(() => page.getByText(/Esporta FBX/).click()),
  ]);
  expect(download.suggestedFilename()).toBe('export.fbx');

  expect(errors).toEqual([]);
});
