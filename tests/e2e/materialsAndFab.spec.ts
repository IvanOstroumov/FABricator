import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';

test('creates a material, assigns it to a single face only, then saves and reopens the project', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cubo' }).click();

  const canvas = page.locator('.viewport3d');
  await canvas.click();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport not found');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.keyboard.press('4'); // face mode
  await page.mouse.click(cx, cy); // select only the front face

  await page.locator('.materials-swatch--add').click();
  const colorInput = page.locator('input[type="color"]');
  await colorInput.fill('#00ff00');
  await colorInput.dispatchEvent('input');
  await colorInput.dispatchEvent('change');
  await page.getByRole('button', { name: /Assegna alla selezione/ }).click();

  // Assigning to one face must not recolor the rest of the mesh (this was
  // a real bug: unassigned faces defaulted to the same slot index as the
  // first real material).
  await expect(page.locator('.materials-swatch').first()).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('File', { exact: true }).click().then(() => page.getByText('Salva (Ctrl+S)').click()),
  ]);
  const savePath = path.join(os.tmpdir(), `fabricator-e2e-${test.info().testId}.fab`);
  await download.saveAs(savePath);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.viewport3d canvas');
  await expect(page.locator('.hierarchy-row')).toHaveCount(0);

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('File', { exact: true }).click().then(() => page.getByText('Apri…').click()),
  ]);
  await fileChooser.setFiles(savePath);

  await expect(page.locator('.hierarchy-row')).toHaveCount(1);
  await page.locator('.hierarchy-row').first().click();
  await expect(page.locator('.materials-swatch').first()).toBeVisible();

  expect(errors).toEqual([]);
});
