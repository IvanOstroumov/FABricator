import { test, expect } from '@playwright/test';

test('adds a primitive, renames it, and undoes/redoes without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();

  const rows = page.locator('.hierarchy-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Cubo');

  await rows.first().dblclick();
  await page.locator('.hierarchy-row input').fill('Prop01');
  await page.keyboard.press('Enter');
  await expect(rows.first()).toContainText('Prop01');

  await page.keyboard.press('Control+z');
  await expect(rows.first()).toContainText('Cubo');
  await page.keyboard.press('Control+Shift+z');
  await expect(rows.first()).toContainText('Prop01');

  expect(errors).toEqual([]);
});

test('duplicates and deletes the active object', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Sfera' }).click();

  const rows = page.locator('.hierarchy-row');
  await rows.first().click();
  await page.keyboard.press('Control+d');
  await expect(rows).toHaveCount(2);

  await page.keyboard.press('Delete');
  await expect(rows).toHaveCount(1);
});
