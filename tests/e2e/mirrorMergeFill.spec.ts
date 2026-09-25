import { test, expect } from '@playwright/test';

test('applies a non-destructive mirror and undoes it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();
  await page.locator('.hierarchy-row').first().click();

  await expect(page.locator('.status-bar')).toContainText('Triangles: 12');

  await page.locator('.properties-group--mirror input[type="checkbox"]').first().click();
  await page.getByRole('button', { name: 'Applica' }).click();
  await expect(page.locator('.status-bar')).toContainText('Triangles: 24');

  await page.keyboard.press('Control+z');
  await expect(page.locator('.status-bar')).toContainText('Triangles: 12');

  expect(errors).toEqual([]);
});

test('deletes a face and fills the hole back in from the Edit menu', async ({ page }) => {
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
  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport not found');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.keyboard.press('4');
  await page.mouse.click(cx, cy);
  await page.keyboard.press('Delete');
  await expect(page.locator('.status-bar')).toContainText('Triangles: 10');

  await page.keyboard.press('3');
  await page.mouse.click(514, 467); // a border edge of the hole
  await expect(page.locator('.status-bar')).toContainText('Selection: 1');

  await page.getByText('Edit', { exact: true }).click();
  await page.getByText('Riempi buco', { exact: true }).click();
  await expect(page.locator('.status-bar')).toContainText('Triangles: 12');

  expect(errors).toEqual([]);
});
