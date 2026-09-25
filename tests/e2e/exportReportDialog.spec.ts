import { test, expect } from '@playwright/test';

test('the export report dialog shows stats, can be cancelled, and does not write a file', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  let downloadFired = false;
  page.on('download', () => {
    downloadFired = true;
  });

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();

  await page.getByText('File', { exact: true }).click();
  await page.getByText(/Esporta FBX/).click();

  await expect(page.getByText('Riepilogo esportazione FBX')).toBeVisible();
  await expect(page.getByText('Triangoli')).toBeVisible();
  await expect(page.getByText('12', { exact: true })).toBeVisible(); // a cube exports as 12 triangles

  await page.getByRole('button', { name: 'Annulla' }).click();
  await expect(page.getByText('Riepilogo esportazione FBX')).toBeHidden();
  await page.waitForTimeout(300);

  expect(downloadFired).toBe(false);
  expect(errors).toEqual([]);
});
