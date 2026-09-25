import { test, expect } from '@playwright/test';

test('extrudes, insets and deletes a face without producing an invalid mesh', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();
  await page.locator('.hierarchy-row').first().click();

  const canvas = page.locator('.viewport3d');
  await canvas.click();
  await page.keyboard.press('4'); // face mode

  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport not found');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.click(cx, cy);
  await expect(page.locator('.status-bar')).toContainText('Triangles: 12');

  await page.keyboard.press('Control+e');
  await expect(page.locator('.status-bar')).toContainText('Triangles: 20');

  await page.keyboard.press('i');
  await expect(page.locator('.status-bar')).toContainText('Triangles: 28');

  await page.keyboard.press('Delete');
  await expect(page.locator('.status-bar')).toContainText('Triangles: 26');
  await expect(page.locator('.status-bar')).toContainText('Selection: 0');

  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await expect(page.locator('.status-bar')).toContainText('Triangles: 12');

  expect(errors).toEqual([]);
});
