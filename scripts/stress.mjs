import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch();
await mkdir('output/playwright', { recursive: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Smooth motion', { exact: true }).uncheck();
  const session = await page.context().newCDPSession(page);
  const metrics = [];
  for (let batch = 0; batch < 4; batch++) {
    await page.evaluate(async () => {
      const carousel = document.querySelector('[aria-label="Destinations"]');
      const viewport = carousel.querySelector('.react-slideable__viewport');
      const next = carousel.querySelector('[aria-label="Next slide"]');
      for (let i = 0; i < 500; i++) {
        next.click();
        viewport.dispatchEvent(new Event('scrollend'));
        if (i % 20 === 0) await new Promise(resolve => requestAnimationFrame(resolve));
      }
    });
    await session.send('HeapProfiler.collectGarbage');
    const heap = await session.send('Runtime.getHeapUsage');
    const dom = await session.send('Memory.getDOMCounters');
    metrics.push({
      navigations: (batch + 1) * 500,
      heapBytes: heap.usedSize,
      ...dom,
      slides: await page.locator('[aria-label="Destinations"] .react-slideable__slide').count(),
    });
  }
  await page.goto('http://127.0.0.1:5173/tests/fixture.html');
  await session.send('HeapProfiler.collectGarbage');
  metrics.push({ remounts: 0, ...(await session.send('Memory.getDOMCounters')) });
  for (let i = 0; i < 50; i++) {
    await page.getByRole('button', { name: 'Toggle carousel', exact: true }).click();
    await page.getByRole('button', { name: 'Toggle carousel', exact: true }).click();
    if ([0, 24, 49].includes(i)) {
      await session.send('HeapProfiler.collectGarbage');
      metrics.push({
        remounts: i + 1,
        heapBytes: (await session.send('Runtime.getHeapUsage')).usedSize,
        ...(await session.send('Memory.getDOMCounters')),
      });
    }
  }
  console.log(JSON.stringify(metrics, null, 2));
  await writeFile('output/playwright/stress.json', JSON.stringify(metrics, null, 2));
  const remounts = metrics.filter(row => row.remounts > 0);
  if (remounts.some(row => row.jsEventListeners !== remounts[0].jsEventListeners))
    throw new Error('Listeners grew after remounts');
  if (metrics.slice(0, 4).some(row => row.slides !== metrics[0].slides)) throw new Error('DOM grew');
  if (metrics[3].heapBytes - metrics[0].heapBytes > 1_000_000) throw new Error('Retained heap grew by more than 1MB');
} finally {
  await browser.close();
}
