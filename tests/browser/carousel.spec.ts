import { test, expect, type Locator } from '@playwright/test';

async function recordRelease(viewport: Locator) {
  await viewport.evaluate(el => {
    el.addEventListener(
      'pointerup',
      () => {
        const positions = [el.scrollLeft];
        (el as HTMLElement).dataset.release = JSON.stringify(positions);
        queueMicrotask(() => {
          positions.push(el.scrollLeft);
          setTimeout(() => {
            positions.push(el.scrollLeft);
            setTimeout(() => {
              positions.push(el.scrollLeft);
              (el as HTMLElement).dataset.release = JSON.stringify(positions);
            }, 450);
          }, 100);
        });
      },
      { once: true },
    );
  });
}

async function expectAnimatedRelease(viewport: Locator) {
  await expect.poll(async () => JSON.parse((await viewport.getAttribute('data-release')) ?? '[]').length).toBe(4);
  const [before, immediate, middle, final] = JSON.parse((await viewport.getAttribute('data-release'))!);
  expect(Math.abs(immediate - before)).toBeLessThan(1);
  expect(Math.abs(middle - before)).toBeGreaterThan(1);
  expect(Math.abs(final - middle)).toBeGreaterThan(1);
  expect(await viewport.evaluate(el => (el as HTMLElement).style.scrollSnapType)).toBe('');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.getByLabel('Smooth motion', { exact: true }).uncheck();
});

test('wraps in both directions without growing DOM', async ({ page }) => {
  const carousel = page.getByRole('region', { name: 'Destinations' });
  const viewport = carousel.locator('.react-slideable__viewport');
  const before = await carousel.locator('.react-slideable__slide').count();
  for (let i = 0; i < 20; i++) {
    await carousel.getByRole('button', { name: 'Next slide', exact: true }).click();
    await expect(carousel.locator('.react-slideable__status')).toHaveText(`Slide ${((i + 1) % 5) + 1} of 5`);
  }
  await carousel.getByRole('button', { name: 'Previous slide', exact: true }).click();
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 5 of 5');
  expect(await carousel.locator('.react-slideable__slide').count()).toBe(before);
  expect(await viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
});

test('finite boundaries, empty and short lists, independent instance', async ({ page }) => {
  await page.getByLabel('Looped', { exact: true }).uncheck();
  const carousel = page.getByRole('region', { name: 'Destinations' });
  await expect(carousel.getByRole('button', { name: 'Previous slide', exact: true })).toBeDisabled();
  await carousel.locator('.react-slideable__viewport').focus();
  await page.keyboard.press('End');
  await expect(carousel.getByRole('button', { name: 'Next slide', exact: true })).toBeDisabled();
  const height = await carousel.locator('.react-slideable__viewport').evaluate(el => el.clientHeight);
  await page.locator('#amount').fill('0');
  await expect(carousel.locator('.react-slideable__slide')).toHaveCount(0);
  await expect(carousel.locator('.react-slideable__status')).toHaveText('No slides');
  expect(await carousel.locator('.react-slideable__viewport').evaluate(el => el.clientHeight)).toBe(height);
  await expect(carousel.getByText('No slides. Increase slide count below.')).toBeVisible();
  const secondary = page.getByRole('region', { name: 'Library features' });
  await secondary.getByRole('button', { name: 'Next slide', exact: true }).click();
  await expect(secondary.locator('.react-slideable__status')).toHaveText('Slide 2 of 4');
  await page.locator('#amount').fill('1');
  await page.getByLabel('Looped', { exact: true }).check();
  await expect(carousel.locator('.react-slideable__slide')).toHaveCount(1);
});

test('container resize preserves logical index and produces no page overflow', async ({ page }) => {
  const carousel = page.getByRole('region', { name: 'Destinations' });
  await carousel.getByRole('button', { name: 'Go to slide 3', exact: true }).click();
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 3 of 5');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 3 of 5');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect
    .poll(() =>
      carousel
        .locator('.react-slideable__slide')
        .first()
        .evaluate(el => Math.round(el.getBoundingClientRect().width)),
    )
    .toBeGreaterThan(280);
});

test('mouse drag moves', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse input only');
  const carousel = page.getByRole('region', { name: 'Destinations' });
  await carousel.locator('.react-slideable__viewport').scrollIntoViewIfNeeded();
  const bounds = (await carousel.locator('.react-slideable__viewport').boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + 150);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + 150, { steps: 12 });
  await page.mouse.up();
  await expect(carousel.locator('.react-slideable__status')).not.toHaveText('Slide 1 of 5');
});

test('remount restores initial position and fresh child state', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const carousel = page.getByRole('region', { name: 'Interactive slides' });
  await carousel.getByRole('button', { name: 'Count 0', exact: true }).click();
  await carousel.getByRole('button', { name: 'Next slide', exact: true }).click();
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 2 of 2');
  await page.getByRole('button', { name: 'Toggle carousel', exact: true }).click();
  await expect(carousel).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle carousel', exact: true }).click();
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 1 of 2');
  await expect(carousel.getByRole('button', { name: 'Count 0', exact: true })).toBeVisible();
});

test('reduced motion and smooth wrapping', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByLabel('Smooth motion', { exact: true }).check();
  const carousel = page.getByRole('region', { name: 'Destinations' });
  await carousel.locator('.react-slideable__viewport').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 5 of 5');
  await page.keyboard.press('ArrowRight');
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 1 of 5');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.keyboard.press('ArrowLeft');
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 5 of 5');
  await page.keyboard.press('ArrowRight');
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 1 of 5');
});

test('rapid keyboard navigation preserves every requested step', async ({ page }) => {
  const carousel = page.getByRole('region', { name: 'Destinations' });
  await carousel.locator('.react-slideable__viewport').focus();
  for (let i = 0; i < 17; i++) await page.keyboard.press('ArrowRight');
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 3 of 5');
});

test('autoplay pauses while focused even after pointer leaves', async ({ page }) => {
  await page.getByLabel('Autoplay', { exact: true }).check();
  const carousel = page.getByRole('region', { name: 'Destinations' });
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 2 of 5', { timeout: 5000 });
  await carousel.locator('.react-slideable__viewport').focus();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(3700);
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 2 of 5');
});

test('native wheel scrolling settles to logical slides', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Wheel input only');
  const carousel = page.getByRole('region', { name: 'Destinations' });
  await carousel.locator('.react-slideable__viewport').hover();
  await page.mouse.wheel(450, 0);
  await expect(carousel.locator('.react-slideable__status')).not.toHaveText('Slide 1 of 5');
});

test('Chromium native touch swipe keeps vertical page scrolling available', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Uses CDP native touch input');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await page.getByLabel('Smooth motion', { exact: true }).check();
  const carousel = page.getByRole('region', { name: 'Destinations' });
  const viewport = carousel.locator('.react-slideable__viewport');
  await viewport.scrollIntoViewIfNeeded();
  await recordRelease(viewport);
  const bounds = (await viewport.boundingBox())!;
  const x = bounds.x + bounds.width * 0.8;
  const y = Math.max(60, bounds.y + 100);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - i * bounds.width * 0.06, y }],
    });
    await page.waitForTimeout(16);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expectAnimatedRelease(viewport);
  await expect(carousel.locator('.react-slideable__status')).not.toHaveText('Slide 1 of 5');
  const previousY = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + 100, y }] });
  for (let i = 1; i <= 5; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: bounds.x + 100, y: y - i * 12 }],
    });
    await page.waitForTimeout(16);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(previousY);
});

test('fixed height, interactive state, click and input survive wraps', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const carousel = page.getByRole('region', { name: 'Interactive slides' });
  expect(await carousel.locator('.react-slideable__viewport').evaluate(el => el.clientHeight)).toBe(200);
  const counter = carousel.getByRole('button', { name: 'Count 0', exact: true });
  await counter.click();
  await carousel.getByRole('textbox', { name: 'Edit slide' }).fill('saved state');
  await carousel.getByRole('button', { name: 'Next slide', exact: true }).click();
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 2 of 2');
  await carousel.getByRole('button', { name: 'Next slide', exact: true }).click();
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 1 of 2');
  await expect(carousel.getByRole('button', { name: 'Count 1', exact: true })).toBeVisible();
  await expect(carousel.getByRole('textbox', { name: 'Edit slide' })).toHaveValue('saved state');
  await carousel.getByRole('link', { name: 'Slide link' }).click();
  await expect(page).toHaveURL(/#clicked$/);
});

test('one mouse gesture can cross many loop cycles without reaching physical ends', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse input only');
  const carousel = page.getByRole('region', { name: 'Destinations' });
  const viewport = carousel.locator('.react-slideable__viewport');
  await viewport.scrollIntoViewIfNeeded();
  const bounds = (await viewport.boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  await page.mouse.move(x, bounds.y + 120);
  await page.mouse.down();
  await page.mouse.move(x - 10, bounds.y + 120);
  for (const direction of [-1, 1]) {
    for (let i = 1; i <= 25; i++) {
      await page.mouse.move(x + direction * i * bounds.width, bounds.y + 120);
      const position = await viewport.evaluate(el => ({
        left: el.scrollLeft,
        maximum: el.scrollWidth - el.clientWidth,
      }));
      expect(position.left).toBeGreaterThan(0);
      expect(position.left).toBeLessThan(position.maximum);
    }
  }
  await page.mouse.up();
  await expect(viewport).not.toHaveAttribute('data-dragging', 'true');
  await carousel.getByRole('button', { name: 'Go to slide 2', exact: true }).click();
  await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 2 of 5');
});

test('native scroll rebases preserve fractional visual alignment and buffer headroom', async ({ page }) => {
  const carousel = page.getByRole('region', { name: 'Destinations' });
  const viewport = carousel.locator('.react-slideable__viewport');
  const result = await viewport.evaluate(async el => {
    const element = el as HTMLElement;
    element.style.scrollSnapType = 'none';
    const slide = element.querySelector('.react-slideable__slide') as HTMLElement;
    const gap = parseFloat(getComputedStyle(element.closest('section')!).getPropertyValue('--react-slideable-gap'));
    const step = slide.getBoundingClientRect().width + gap;
    element.scrollLeft = element.scrollWidth - element.clientWidth - step / 3;
    const before = element.scrollLeft;
    element.dispatchEvent(new Event('scroll'));
    const after = element.scrollLeft;
    element.style.scrollSnapType = '';
    return { before, after, step, max: element.scrollWidth - element.clientWidth };
  });
  expect(result.after).toBeLessThan(result.before);
  expect(result.after).toBeGreaterThan(result.step);
  expect(result.max - result.after).toBeGreaterThan(result.step);
  expect(
    Math.abs(
      (result.before - result.after) / (5 * result.step) -
        Math.round((result.before - result.after) / (5 * result.step)),
    ),
  ).toBeLessThan(0.001);
});

test('drag release animates through intermediate positions before restoring snap', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse input only');
  await page.getByLabel('Smooth motion', { exact: true }).check();
  const viewport = page.getByRole('region', { name: 'Destinations' }).locator('.react-slideable__viewport');
  await viewport.scrollIntoViewIfNeeded();
  await recordRelease(viewport);
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8 - 90, box.y + 100, { steps: 8 });
  await page.mouse.up();
  await expectAnimatedRelease(viewport);
});

test('full-width logos, CSS gaps and hidden/custom controls work', async ({ page }) => {
  const logos = page.getByRole('region', { name: 'Company logos' });
  const bounds = (await logos.boundingBox())!;
  expect(bounds.x).toBe(0);
  expect(bounds.width).toBe(await page.evaluate(() => innerWidth));
  await expect(logos.getByRole('button')).toHaveCount(0);
  const cards = page.getByRole('region', { name: 'Library features' });
  await cards.getByRole('button', { name: 'Next slide', exact: true }).click();
  await expect(cards.locator('.react-slideable__status')).toHaveText('Slide 2 of 4');
  const alignment = await cards.locator('.react-slideable__viewport').evaluate(el => {
    const slides = el.querySelectorAll('.react-slideable__slide');
    return Math.abs(slides[1].getBoundingClientRect().left - el.getBoundingClientRect().left);
  });
  expect(alignment).toBeLessThan(1);
  await page.getByLabel('Arrows', { exact: true }).selectOption('hidden');
  const carousel = page.getByRole('region', { name: 'Destinations' });
  await expect(carousel.getByRole('button', { name: 'Next slide', exact: true })).toHaveCount(0);
  await page.getByLabel('Arrows', { exact: true }).selectOption('custom');
  await expect(carousel.getByRole('button', { name: 'Next slide', exact: true })).toHaveText('↗');
  const snippets = page.locator('.example-code');
  await expect(snippets).toHaveCount(3);
  for (const snippet of await snippets.all()) {
    await expect(snippet.locator('pre').first()).not.toBeVisible();
    await snippet.locator('summary').press('Enter');
    await expect(snippet.locator('pre').first()).toBeVisible();
    await expect(snippet.locator('pre').last()).toBeVisible();
    await expect(snippet.locator('.token.keyword').first()).toBeVisible();
    await expect(snippet.locator('.token.selector').first()).toBeVisible();
    const colors = await snippet.evaluate(el => [
      getComputedStyle(el.querySelector('.token.keyword')!).color,
      getComputedStyle(el.querySelector('.token.string')!).color,
    ]);
    expect(colors[0]).not.toBe(colors[1]);
  }
  await expect(snippets.first().locator('.token.attr-name').filter({ hasText: 'ariaLabel' })).toHaveText('ariaLabel');
  await expect(snippets.first().locator('.token.attr-value').filter({ hasText: 'Destinations' })).toContainText(
    'Destinations',
  );
  await page.locator('#gap').fill('24');
  await expect(snippets.first().locator('pre').first()).toContainText('gap="24px"');
  await expect(snippets.first().locator('pre').first()).toContainText('previousIcon="↖"');
  await snippets.first().locator('summary').press('Enter');
  await expect(snippets.first().locator('pre').first()).not.toBeVisible();
});

test('CSS media gaps preserve loop alignment in a fixed-width container with padded slides', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const carousel = page.getByRole('region', { name: 'CSS styled slides' });
  const viewport = carousel.locator('.react-slideable__viewport');
  for (const [width, gap] of [
    [1100, 32],
    [700, 12],
    [1100, 32],
  ]) {
    await page.setViewportSize({ width, height: 800 });
    await expect
      .poll(() => carousel.locator('.react-slideable__track').evaluate(el => getComputedStyle(el).columnGap))
      .toBe(`${gap}px`);
    await carousel.getByRole('button', { name: 'Go to slide 3', exact: true }).click();
    await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 3 of 3');
    await expect
      .poll(() =>
        viewport.evaluate(el => {
          const slide = el.querySelector('.react-slideable__slide:not([data-copy])[aria-label="3 of 3"]')!;
          return Math.abs(slide.getBoundingClientRect().left - el.getBoundingClientRect().left);
        }),
      )
      .toBeLessThan(1);
    const geometry = await viewport.evaluate(el => ({
      width: el.clientWidth,
      slide: el.querySelector('.react-slideable__slide')!.getBoundingClientRect().width,
    }));
    expect(geometry.slide).toBeCloseTo((geometry.width - gap) / 2, 1);
    expect((await carousel.boundingBox())!.width).toBe(500);
    await carousel.getByRole('button', { name: 'Next slide', exact: true }).click();
    await expect(carousel.locator('.react-slideable__status')).toHaveText('Slide 1 of 3');
  }
  expect(
    await carousel.locator('.react-slideable__button--next').evaluate(el => getComputedStyle(el).borderRadius),
  ).toBe('6px');
});

test('explicit gap prop takes precedence over CSS media gaps', async ({ page }) => {
  await page.goto('/tests/fixture.html?gap');
  const carousel = page.getByRole('region', { name: 'CSS styled slides' });
  for (const width of [1100, 700]) {
    await page.setViewportSize({ width, height: 800 });
    await expect
      .poll(() => carousel.locator('.react-slideable__track').evaluate(el => getComputedStyle(el).columnGap))
      .toBe('40px');
  }
});

test('canceling a drag restores snapping and preserves subsequent button and keyboard clicks', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse input only');
  await page.goto('/tests/fixture.html');
  const carousel = page.getByRole('region', { name: 'Interactive slides' });
  const viewport = carousel.locator('.react-slideable__viewport');
  await viewport.evaluate(el =>
    el.addEventListener('pointerdown', event => {
      (el as HTMLElement).dataset.testPointer = String((event as PointerEvent).pointerId);
    }),
  );
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + 200, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 100, { steps: 5 });
  await viewport.evaluate(el =>
    el.dispatchEvent(
      new PointerEvent('pointercancel', {
        pointerId: Number((el as HTMLElement).dataset.testPointer),
        pointerType: 'mouse',
        bubbles: true,
      }),
    ),
  );
  await page.mouse.up();
  await expect(viewport).not.toHaveAttribute('data-dragging', 'true');
  expect(await viewport.evaluate(el => (el as HTMLElement).style.scrollSnapType)).toBe('');
  await carousel.getByRole('button', { name: 'Count 0', exact: true }).click();
  await carousel.getByRole('button', { name: 'Count 1', exact: true }).press('Enter');
  await expect(carousel.getByRole('button', { name: 'Count 2', exact: true })).toBeVisible();
});
