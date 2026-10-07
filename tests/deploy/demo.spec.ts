import { test, expect } from '@playwright/test';

test('built demo works under the GitHub Pages repository path', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto('./');
  const carousel = page.getByRole('region', { name: 'Destinations' });
  await expect(carousel.locator('img').first()).toBeVisible();
  await expect
    .poll(() =>
      carousel
        .locator('img')
        .evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0)),
    )
    .toBe(true);
  await carousel.getByRole('button', { name: 'Next slide', exact: true }).click();
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 2 of 5');
  await page.locator('.example-code').first().locator('summary').click();
  await expect(page.locator('.example-code').first().locator('pre').first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
