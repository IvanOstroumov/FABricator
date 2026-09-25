import { test, expect } from '@playwright/test';

test('loads the workspace with viewport, toolbar and side panel', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.viewport3d canvas')).toBeVisible();
  await expect(page.locator('.toolbar')).toBeVisible();
  await expect(page.getByText('HIERARCHY', { exact: false })).toBeVisible();

  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('switches quick views and shading modes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Top' }).click();
  await expect(page.getByRole('button', { name: 'Top' })).toHaveClass(/active/);

  await page.getByRole('button', { name: 'Wireframe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Wireframe', exact: true })).toHaveClass(/active/);
});
