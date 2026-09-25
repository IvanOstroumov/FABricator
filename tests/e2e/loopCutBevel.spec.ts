import { test, expect } from '@playwright/test';

// Screen coordinates below target the left vertical edge of the default
// cube's visible front face, as rendered by the default camera framing
// (see tests/e2e/selection.spec.ts for the equivalent face-center point).
const LEFT_EDGE_X = 514;
const LEFT_EDGE_Y = 467;

test('bevels an edge, undoes it, then loop-cuts the same edge', async ({ page }) => {
  // The hardcoded edge coordinates below assume this viewport size (they
  // were measured against a screenshot taken at 1400x900).
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();
  await page.locator('.hierarchy-row').first().click();

  const canvas = page.locator('.viewport3d');
  await canvas.click();
  await page.keyboard.press('3'); // edge select mode

  await page.mouse.click(LEFT_EDGE_X, LEFT_EDGE_Y);
  await expect(page.locator('.status-bar')).toContainText('Triangles: 12');
  await expect(page.locator('.status-bar')).toContainText('Selection: 1');

  await page.keyboard.press('Control+b'); // bevel
  await expect(page.locator('.status-bar')).toContainText('Triangles: 16');

  await page.keyboard.press('Control+z');
  await expect(page.locator('.status-bar')).toContainText('Triangles: 12');

  await page.mouse.click(LEFT_EDGE_X, LEFT_EDGE_Y);
  await expect(page.locator('.status-bar')).toContainText('Selection: 1');
  await page.keyboard.press('Control+r'); // loop cut
  await expect(page.locator('.status-bar')).toContainText('Triangles: 20');

  await page.keyboard.press('Control+z');
  await expect(page.locator('.status-bar')).toContainText('Triangles: 12');

  expect(errors).toEqual([]);
});
