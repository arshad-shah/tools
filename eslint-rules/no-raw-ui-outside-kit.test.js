import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';
import rule from './no-raw-ui-outside-kit.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const TOOL = 'src/tools/x/Tool.tsx';
const RAW = [
  'button',
  'input',
  'select',
  'textarea',
  'svg',
  'img',
  'canvas',
  'video',
  'audio',
  'iframe',
];
const SVG_CHILDREN = [
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'g',
  'defs',
  'use',
  'text',
  'tspan',
  'mask',
  'clipPath',
  'pattern',
  'linearGradient',
  'radialGradient',
  'stop',
  'marker',
  'symbol',
  'foreignObject',
  'image',
];

tester.run('no-raw-ui-outside-kit', rule, {
  valid: [
    { code: `const a = <Button>Go</Button>;`, filename: TOOL },
    { code: `const a = <div className="flex" />;`, filename: TOOL },
    {
      code: `const a = <button style={{}} />;`,
      filename: 'src/shared/ui/button.tsx',
    },
    {
      code: `const a = <svg><path d="M0 0" /></svg>;`,
      filename: 'C:\\repo\\src\\shared\\ui\\icons\\custom\\keys.tsx',
    },
    { code: `const a = <button />;`, filename: 'src/tools/x/Tool.test.tsx' },
    { code: `const a = React.createElement('div');`, filename: TOOL },
    { code: `const a = <Input type="text" />;`, filename: TOOL },
    { code: `const a = <Image alt="x" src={b} />;`, filename: TOOL },
    { code: `const a = <x.button />;`, filename: TOOL },
    // Workers draw on OffscreenCanvas, which is not an element.
    { code: `const c = new OffscreenCanvas(1, 1);`, filename: 'src/pdf/a.ts' },
    { code: `const a = document.createElement('a');`, filename: TOOL },
    { code: `const a = <Box styles={s} />;`, filename: TOOL },
    // Imperative style writes are allowed inside the kit.
    {
      code: `panel.style.left = '3px';`,
      filename: 'src/shared/ui/popover.tsx',
    },
    { code: `const s = el.style.left;`, filename: TOOL },
    { code: `el.setAttribute('aria-label', 'x');`, filename: TOOL },
    { code: `opts.styles.left = 1;`, filename: TOOL },
    { code: `Object.assign(target, el.style);`, filename: TOOL },
  ],
  invalid: [
    ...[...RAW, ...SVG_CHILDREN].map((t) => ({
      code: `const a = <${t} />;`,
      filename: TOOL,
      errors: [{ messageId: 'element', data: { name: t } }],
    })),
    {
      code: `const a = <div style={{ width: 3 }} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = <Box style={s} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = <div {...{ style: s }} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = <div {...{ 'style': s }} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = React.createElement('svg');`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'element', data: { name: 'svg' } }],
    },
    {
      code: `const a = createElement('canvas', null);`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'element', data: { name: 'canvas' } }],
    },
    {
      code: 'const a = createElement(`img`);',
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'element', data: { name: 'img' } }],
    },
    {
      code: `const el = document.createElement('canvas');`,
      filename: 'src/pdf/components/x.ts',
      errors: [{ messageId: 'dom', data: { name: 'canvas' } }],
    },
    {
      code: `const el = document.createElementNS(ns, 'svg');`,
      filename: 'src/pdf/components/x.ts',
      errors: [{ messageId: 'dom', data: { name: 'svg' } }],
    },
    ...[
      `panel.style.left = '3px';`,
      `panel.style['top'] = '3px';`,
      `el.current.style.transform += ' scale(2)';`,
      `el['style'].width = w;`,
      `el.style.cssText = 'left: 0';`,
      `el.style.setProperty('--x', '1');`,
    ].map((code) => ({
      code,
      filename: 'src/pdf/components/FileThumb.tsx',
      errors: [{ messageId: 'imperative', data: { how: 'element.style.*' } }],
    })),
    {
      code: `el.setAttribute('style', 'left: 0');`,
      filename: 'src/app/a.tsx',
      errors: [
        { messageId: 'imperative', data: { how: "setAttribute('style')" } },
      ],
    },
    {
      code: 'el.setAttribute(`style`, s);',
      filename: 'src/app/a.tsx',
      errors: [
        { messageId: 'imperative', data: { how: "setAttribute('style')" } },
      ],
    },
    {
      code: `Object.assign(el.style, { left: '0' });`,
      filename: 'src/app/a.tsx',
      errors: [
        {
          messageId: 'imperative',
          data: { how: 'Object.assign(element.style)' },
        },
      ],
    },
  ],
});
