import { test, expect } from '@playwright/test';

// Regression test: the UV editor used to memoize its line layout on the
// `EditableMesh` object reference alone, but unwrap/seam operations mutate
// `heUv` in place (same reference) — so the panel never updated after the
// very first render. It now also depends on the document revision.
test('the UV editor layout updates after a cylindrical projection, not just on first mount', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await page.getByText('Add', { exact: true }).click();
  await page.getByRole('button', { name: 'Cilindro' }).click();
  await page.locator('.hierarchy-row').first().click();

  await page.getByText('Editor UV', { exact: true }).click();
  await expect(page.locator('.uv-editor__edge')).not.toHaveCount(0);

  const before = await page.locator('.uv-editor__edge').evaluateAll((els) =>
    els.map((el) => el.getAttribute('y1')).sort(),
  );

  await page.getByText('UV', { exact: true }).click();
  await page.getByText('Proiezione cilindrica', { exact: true }).click();

  const after = await page.locator('.uv-editor__edge').evaluateAll((els) =>
    els.map((el) => el.getAttribute('y1')).sort(),
  );

  expect(after).not.toEqual(before);
  expect(errors).toEqual([]);
});
