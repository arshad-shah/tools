/** @vitest-environment jsdom */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { IconComponent } from '../src/shared/ui/icons';

/*
 * Grid review for every custom icon (plan G-1, spec §4.7): drawn on the 24px
 * grid, stroke width inherited from the component, fill only on icons that
 * declare { fill: true }. The name list makes additions and removals
 * deliberate: a new custom icon is added here in the same commit.
 */

const CUSTOM: Record<string, string[]> = {
  annotate: [
    'IconSelectTool',
    'IconTextComment',
    'IconSquiggly',
    'IconArrowAnnot',
    'IconLineAnnot',
    'IconStampPreset',
    'IconReply',
    'IconEllipseAnnot',
  ],
  brand: ['IconStarFilled', 'IconGithub'],
  diagram: [
    'IconZoomIn',
    'IconZoomOut',
    'IconMaximize',
    'IconMap',
    'IconLocate',
    'IconActualSize',
    'IconLayoutLeftRight',
    'IconLayoutTopBottom',
  ],
  edit: [
    'IconCoverReplace',
    'IconHeaderFooter',
    'IconPageNumbers',
    'IconWatermark',
  ],
  'fill-sign': [
    'IconFlatFormDetect',
    'IconMakeFillable',
    'IconFieldText',
    'IconFieldTick',
    'IconFieldCross',
    'IconFieldDate',
    'IconFieldSignature',
    'IconFieldSuggested',
    'IconSnapToCell',
    'IconNextField',
    'IconMyDetails',
    'IconFlatten',
    'IconSignatureDraw',
    'IconSignatureType',
    'IconSignatureUpload',
    'IconInitials',
  ],
  keys: [
    'KeyCommand',
    'KeyShift',
    'KeyOption',
    'KeyControl',
    'KeyEnter',
    'KeyBackspace',
    'KeyTab',
    'KeyEscape',
    'KeyArrowUp',
    'KeyArrowDown',
    'KeyArrowLeft',
    'KeyArrowRight',
  ],
  layout: [
    'IconLayoutStandard',
    'IconLayoutFocus',
    'IconDock',
    'IconRailToggle',
    'IconInspectorToggle',
    'IconZoomFitWidth',
    'IconZoomFitPage',
  ],
  modes: [
    'IconModeOrganize',
    'IconModeEdit',
    'IconModeAnnotate',
    'IconModeFillSign',
    'IconModeRedact',
    'IconModeConvert',
    'IconModeProtect',
    'IconModeOptimize',
    'IconModeOcr',
  ],
  ocr: ['IconOcrScan', 'IconOcrLanguage', 'IconTextLayer'],
  optimize: [
    'IconSanitize',
    'IconPermissions',
    'IconLinearize',
    'IconRepair',
    'IconSizeBreakdown',
  ],
  organize: [
    'IconInsertBlankPage',
    'IconDuplicatePage',
    'IconExtractPages',
    'IconSplitAt',
    'IconMergeIn',
    'IconCropPage',
    'IconPageLabel',
    'IconRotatePageCw',
    'IconRotatePageCcw',
  ],
  redact: [
    'IconRedactArea',
    'IconRedactSearch',
    'IconRedactApply',
    'IconRedactVerified',
    'IconRasterised',
  ],
  signing: [
    'IconCertificate',
    'IconCertificateNew',
    'IconInitialPages',
    'IconInkPen',
    'IconInkWeight',
    'IconNextSignTarget',
    'IconSignatureBlock',
    'IconSignatureBroken',
    'IconSignatureUnknown',
    'IconSignatureVerified',
    'IconSummaryPage',
    'IconTimestamp',
    'IconTraceSignature',
  ],
  'tools-p6': [
    'IconSendTo',
    'IconShareLink',
    'IconBitToggle',
    'IconPanelLeftClose',
    'IconPanelLeftOpen',
    'IconPanelRightClose',
    'IconPanelRightOpen',
    'IconPanelTopClose',
    'IconPanelTopOpen',
    'IconPanelBottomClose',
    'IconPanelBottomOpen',
    'IconPipette',
  ],
};

/** Icons drawn as solid shapes (defineIcon(..., { fill: true })). */
const FILLED = new Set(['IconStarFilled', 'IconGithub']);

const modules = import.meta.glob<Record<string, unknown>>(
  '../src/shared/ui/icons/custom/*.tsx',
  { eager: true },
);

const groups = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [
    path.replace(/^.*\/(.+)\.tsx$/, '$1'),
    Object.entries(mod).filter(
      ([name, v]) => /^(Icon|Key)[A-Z]/.test(name) && typeof v === 'function',
    ) as [string, IconComponent][],
  ]),
);

const all = Object.entries(groups).flatMap(([group, icons]) =>
  icons.map(([name, Icon]) => ({ group, name, Icon })),
);

function svgOf(Icon: IconComponent): SVGSVGElement {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(createElement(Icon));
  return host.querySelector('svg')!;
}

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/iy;

/** Absolute x/y of every end and control point of a path. */
function pathPoints(d: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i]!)) i++;
  };
  const num = () => {
    skip();
    NUM.lastIndex = i;
    const m = NUM.exec(d);
    if (!m) throw new Error(`bad path at ${i}: ${d}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const flag = () => {
    skip();
    return Number(d[i++]);
  };
  const more = () => {
    skip();
    return i < d.length && !/[a-z]/i.test(d[i]!);
  };
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cmd = '';
  while (true) {
    skip();
    if (i >= d.length) break;
    if (/[a-z]/i.test(d[i]!)) cmd = d[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const pt = () => {
      const px = num() + (rel ? x : 0);
      const py = num() + (rel ? y : 0);
      out.push([px, py]);
      return [px, py] as const;
    };
    if (C === 'Z') {
      x = sx;
      y = sy;
      continue;
    }
    do {
      if (C === 'M' || C === 'L' || C === 'T') {
        [x, y] = pt();
        if (C === 'M') {
          [sx, sy] = [x, y];
          cmd = rel ? 'l' : 'L';
        }
      } else if (C === 'H') {
        x = num() + (rel ? x : 0);
        out.push([x, y]);
      } else if (C === 'V') {
        y = num() + (rel ? y : 0);
        out.push([x, y]);
      } else if (C === 'C') {
        pt();
        pt();
        [x, y] = pt();
      } else if (C === 'S' || C === 'Q') {
        pt();
        [x, y] = pt();
      } else if (C === 'A') {
        num();
        num();
        num();
        flag();
        flag();
        [x, y] = pt();
      } else throw new Error(`unknown command ${cmd}`);
    } while (more());
  }
  return out;
}

function extent(el: Element): [number, number][] {
  const n = (a: string) => Number(el.getAttribute(a) ?? 0);
  switch (el.tagName.toLowerCase()) {
    case 'path':
      return pathPoints(el.getAttribute('d') ?? '');
    case 'rect':
      return [
        [n('x'), n('y')],
        [n('x') + n('width'), n('y') + n('height')],
      ];
    case 'circle':
      return [
        [n('cx') - n('r'), n('cy') - n('r')],
        [n('cx') + n('r'), n('cy') + n('r')],
      ];
    case 'ellipse':
      return [
        [n('cx') - n('rx'), n('cy') - n('ry')],
        [n('cx') + n('rx'), n('cy') + n('ry')],
      ];
    case 'line':
      return [
        [n('x1'), n('y1')],
        [n('x2'), n('y2')],
      ];
    case 'polyline':
    case 'polygon': {
      const v = (el.getAttribute('points') ?? '')
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      const pts: [number, number][] = [];
      for (let k = 0; k + 1 < v.length; k += 2) pts.push([v[k]!, v[k + 1]!]);
      return pts;
    }
    default:
      return [];
  }
}

describe('custom icon grid', () => {
  it('parses relative, compact and arc path data', () => {
    expect(pathPoints('M2 3h4v2l-1 1z')).toEqual([
      [2, 3],
      [6, 3],
      [6, 5],
      [5, 6],
    ]);
    expect(pathPoints('M5.37.5a.5.5 0 0 1 .5.5')).toEqual([
      [5.37, 0.5],
      [5.87, 1],
    ]);
  });

  it('the custom icon list changes only deliberately', () => {
    const found = Object.fromEntries(
      Object.entries(groups).map(([g, icons]) => [
        g,
        icons.map(([n]) => n).sort(),
      ]),
    );
    const expected = Object.fromEntries(
      Object.entries(CUSTOM).map(([g, names]) => [g, [...names].sort()]),
    );
    expect(found).toEqual(expected);
  });

  it.each(all)('$group/$name stays inside the 24px grid', ({ Icon }) => {
    const svg = svgOf(Icon);
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    for (const el of svg.querySelectorAll('*')) {
      for (const [px, py] of extent(el)) {
        expect(px, el.outerHTML).toBeGreaterThanOrEqual(0);
        expect(px, el.outerHTML).toBeLessThanOrEqual(24);
        expect(py, el.outerHTML).toBeGreaterThanOrEqual(0);
        expect(py, el.outerHTML).toBeLessThanOrEqual(24);
      }
    }
  });

  it.each(all)('$group/$name inherits the stroke width', ({ Icon }) => {
    const svg = svgOf(Icon);
    for (const el of svg.querySelectorAll('*'))
      expect(el.hasAttribute('stroke-width'), el.outerHTML).toBe(false);
  });

  it.each(all)('$group/$name fills only when declared', ({ name, Icon }) => {
    const svg = svgOf(Icon);
    const filled = FILLED.has(name);
    expect(svg.getAttribute('fill')).toBe(filled ? 'currentColor' : 'none');
    for (const el of svg.querySelectorAll('*'))
      expect(el.hasAttribute('fill'), el.outerHTML).toBe(false);
  });
});
