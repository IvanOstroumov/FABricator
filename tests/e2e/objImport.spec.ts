import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const CUBE_OBJ = `v -0.5 -0.5 -0.5
v  0.5 -0.5 -0.5
v  0.5  0.5 -0.5
v -0.5  0.5 -0.5
v -0.5 -0.5  0.5
v  0.5 -0.5  0.5
v  0.5  0.5  0.5
v -0.5  0.5  0.5
f 1 2 3 4
f 5 8 7 6
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 5 1 4 8
`;

test('imports an OBJ file as a new scene object', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  const objPath = path.join(os.tmpdir(), `fabricator-e2e-${test.info().testId}.obj`);
  fs.writeFileSync(objPath, CUBE_OBJ);

  await page.goto('/');
  await page.getByText('File', { exact: true }).click();

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Importa OBJ…').click(),
  ]);
  await chooser.setFiles(objPath);

  await expect(page.getByText(path.basename(objPath, '.obj'))).toBeVisible();
  await expect(page.locator('text=Triangles: 12')).toBeVisible();
  expect(errors).toEqual([]);
});

test('shows an error and does not crash when importing an invalid OBJ', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  const badPath = path.join(os.tmpdir(), `fabricator-e2e-bad-${test.info().testId}.obj`);
  fs.writeFileSync(badPath, '# empty file\n');

  await page.goto('/');
  await page.getByText('File', { exact: true }).click();

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Importa OBJ…').click(),
  ]);
  await chooser.setFiles(badPath);

  await expect(page.getByText(/Errore/)).toBeVisible();
  expect(errors).toEqual([]);
});
