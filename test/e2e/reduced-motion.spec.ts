import { expect, test, type Page } from '@playwright/test';
import { openInWorkspace } from './workspace-helpers';

/*
 * Reduced-motion audit (spec §4.4, §13.2, plan G-4). With
 * prefers-reduced-motion: reduce, every animation the document runs during
 * the interactions below is sampled every 50 ms: none may last longer than
 * 80 ms and none may animate a transform. The Logo caret never blinks and
 * scrolling is not smooth. Without reduced motion the caret blinks three
 * times and stops.
 */

interface Sample {
  target: string;
  name: string;
  duration: number;
  properties: string[];
}

declare global {
  interface Window {
    __motion: Sample[];
  }
}

const TRANSFORM = ['transform', 'translate', 'scale', 'rotate'];

/** Samples document.getAnimations() every 50 ms from the first paint. */
async function sampleAnimations(page: Page) {
  await page.addInitScript(() => {
    window.__motion = [];
    const describe = (el: Element | null) =>
      el
        ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${String(
            el.getAttribute('class') ?? '',
          )
            .split(/\s+/)
            .slice(0, 4)
            .join('.')}`
        : 'unknown';
    const sample = () => {
      for (const a of document.getAnimations()) {
        const effect = a.effect as KeyframeEffect | null;
        if (!effect) continue;
        const timing = effect.getComputedTiming();
        const properties = new Set<string>();
        for (const kf of effect.getKeyframes())
          for (const k of Object.keys(kf))
            if (
              !['offset', 'easing', 'composite', 'computedOffset'].includes(k)
            )
              properties.add(k);
        if (a instanceof CSSTransition) properties.add(a.transitionProperty);
        window.__motion.push({
          target: describe(effect.target),
          name:
            a instanceof CSSAnimation
              ? a.animationName
              : a instanceof CSSTransition
                ? `transition:${a.transitionProperty}`
                : 'script',
          duration: Number(timing.activeDuration),
          properties: [...properties],
        });
      }
    };
    setInterval(sample, 50);
    document.addEventListener('DOMContentLoaded', sample);
  });
}

async function expectNoMotion(page: Page) {
  const samples = await page.evaluate(() => window.__motion);
  const long = samples.filter((s) => !(s.duration <= 80));
  const transform = samples.filter((s) =>
    s.properties.some((p) => TRANSFORM.includes(p)),
  );
  expect(long, 'animations longer than 80 ms').toEqual([]);
  expect(transform, 'transform animations').toEqual([]);
}

const caret = (page: Page) =>
  page.locator('svg[aria-label="tools home"] rect').first();

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => sampleAnimations(page));

  test('Home: no long or transform animation, caret still, scroll not smooth', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(caret(page)).toBeAttached();
    expect(await caret(page).evaluate((el) => el.getAnimations().length)).toBe(
      0,
    );
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe('auto');
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(300);
    await expectNoMotion(page);
  });

  test('a hub: no long or transform animation', async ({ page }) => {
    await page.goto('/text');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('link').filter({ hasText: /\w/ }).nth(3).hover();
    await page.waitForTimeout(300);
    await expectNoMotion(page);
  });

  test('workspace: layout switch, drawer, Mod+K and modes without motion', async ({
    page,
  }) => {
    await openInWorkspace(page, 'test/fixtures/generated/text-3.pdf');
    // F: Focus layout.
    await page.keyboard.press('f');
    const pages = page.getByRole('button', { name: 'Pages', exact: true });
    await expect(pages).toBeVisible();
    // A drawer.
    await pages.click();
    await expect(page.getByRole('dialog', { name: 'Pages' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Pages' })).toHaveCount(0);
    // Mod+K.
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Switch modes with the number keys, then back to Standard.
    for (const key of ['2', '3', '1']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(150);
    }
    await page.keyboard.press('f');
    await page.waitForTimeout(300);
    await expectNoMotion(page);
  });
});

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the Logo caret blinks three times, then stops', async ({ page }) => {
    await page.goto('/');
    await expect(caret(page)).toBeAttached();
    const iterations = await caret(page).evaluate((el) => {
      const [a] = el.getAnimations();
      return a ? a.effect!.getComputedTiming().iterations : null;
    });
    expect(iterations).toBe(3);
    await expect
      .poll(() => caret(page).evaluate((el) => el.getAnimations().length), {
        timeout: 8_000,
      })
      .toBe(0);
  });
});
