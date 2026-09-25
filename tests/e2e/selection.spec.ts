import { test, expect } from '@playwright/test';

test('selects a face, moves it with the modal G tool, and undoes it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();
  await page.locator('.hierarchy-row').first().click();

  const canvas = page.locator('.viewport3d');
  await canvas.click();

  await page.keyboard.press('4'); // face select mode
  await expect(page.getByRole('button', { name: 'Face' })).toHaveClass(/active/);

  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport not found');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.click(cx, cy);
  await expect(page.locator('.status-bar')).toContainText('Selection: 1');

  await page.keyboard.press('g');
  await expect(page.locator('.status-bar')).toContainText('Sposta');
  await page.mouse.move(cx + 80, cy);
  await page.mouse.click(cx + 80, cy);
  await expect(page.locator('.status-bar')).not.toContainText('Sposta');

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(100);

  expect(errors).toEqual([]);
});
