import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';
import rule from './no-raw-ui.js';

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
// Layout and text elements: pages use Stack, Inline, Text, Heading, List.
const LAYOUT = [
  'div',
  'span',
  'p',
  'ul',
  'ol',
  'li',
  'section',
  'article',
  'header',
  'footer',
  'nav',
  'main',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'label',
  'form',
  'table',
  'pre',
  'code',
  'strong',
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

tester.run('no-raw-ui', rule, {
  valid: [
    { code: `const a = <Button>Go</Button>;`, filename: TOOL },
    {
      code: `const a = <Stack gap="4"><Text>Hi</Text></Stack>;`,
      filename: TOOL,
    },
    { code: `const a = <><Heading level={2}>Hi</Heading></>;`, filename: TOOL },
    // Drawing surfaces own their elements, classes and styles.
    {
      code: `const a = <canvas className="tools-x" style={{ width: 3 }} />;`,
      filename: 'src/shared/surfaces/diagram-canvas/DiagramCanvas.tsx',
    },
    {
      code: `const a = <svg><path d="M0 0" /></svg>;`,
      filename: 'C:\\repo\\src\\shared\\surfaces\\logo\\Logo.tsx',
    },
    {
      code: `panel.style.left = '3px'; const c = document.createElement('canvas');`,
      filename: 'src/shared/surfaces/scratch-canvas.ts',
    },
    // The editor and chart mount points: CodeMirror and swift-chart attach here.
    {
      code: `const a = <div ref={host} className="tools-editor" />;`,
      filename: 'src/shared/editor/CodeEditor.tsx',
    },
    {
      code: `const a = <div ref={host} />;`,
      filename: 'src/shared/charts/ChartMount.tsx',
    },
    // TODO(mig/rollout-pdf-workspace): exempt until that branch merges.
    {
      code: `const a = <button style={{}} className="x" />;`,
      filename: 'src/shared/ui/button.tsx',
    },
    { code: `const a = <div className="flex" />;`, filename: 'src/pdf/a.tsx' },
    {
      code: `const a = <div className="flex" />;`,
      filename: 'src/tools/pdf-edit/Tool.tsx',
    },
    { code: `const a = <button />;`, filename: 'src/tools/x/Tool.test.tsx' },
    // createElement of a layout element is not drawn UI (a probe, a host).
    { code: `const a = React.createElement('div');`, filename: TOOL },
    { code: `const a = <Input type="text" />;`, filename: TOOL },
    { code: `const a = <Image alt="x" src={b} />;`, filename: TOOL },
    { code: `const a = <x.button />;`, filename: TOOL },
    // Workers draw on OffscreenCanvas, which is not an element.
    { code: `const c = new OffscreenCanvas(1, 1);`, filename: 'src/pdf/a.ts' },
    { code: `const a = document.createElement('a');`, filename: TOOL },
    { code: `const a = <Box styles={s} />;`, filename: TOOL },
    { code: `const a = <Box styles={s} />;`, filename: 'src/app/a.tsx' },
    { code: `const s = el.style.left;`, filename: TOOL },
    { code: `el.setAttribute('aria-label', 'x');`, filename: TOOL },
    { code: `opts.styles.left = 1;`, filename: TOOL },
    { code: `Object.assign(target, el.style);`, filename: TOOL },
  ],
  invalid: [
    ...[...RAW, ...LAYOUT, ...SVG_CHILDREN].map((t) => ({
      code: `const a = <${t} />;`,
      filename: TOOL,
      errors: [{ messageId: 'element', data: { name: t } }],
    })),
    // The editor and chart folders are exempt only at their mount points.
    {
      code: `const a = <div />;`,
      filename: 'src/shared/editor/FindPanel.tsx',
      errors: [{ messageId: 'element', data: { name: 'div' } }],
    },
    {
      code: `const a = <Stack className="flex gap-2" />;`,
      filename: TOOL,
      errors: [{ messageId: 'className' }],
    },
    {
      code: 'const a = <Card className={`p-${n}`} />;',
      filename: 'src/app/pages/Home.tsx',
      errors: [{ messageId: 'className' }],
    },
    {
      code: `const a = <div className={cn('a', b)} />;`,
      filename: 'src/shared/lib/x.tsx',
      errors: [
        { messageId: 'element', data: { name: 'div' } },
        { messageId: 'className' },
      ],
    },
    {
      code: `const a = <Box style={{ width: 3 }} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = <Box style={s} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = <Box {...{ style: s }} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = <Box {...{ 'style': s }} />;`,
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
      filename: 'src/app/x.ts',
      errors: [{ messageId: 'dom', data: { name: 'canvas' } }],
    },
    {
      code: `const el = document.createElementNS(ns, 'svg');`,
      filename: 'src/app/x.ts',
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
      filename: 'src/tools/x/Thumb.tsx',
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
