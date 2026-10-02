export interface SnippetOptions {
  runtime: 'react' | 'web';
  /** Where the app will serve the .riv file from. */
  src: string;
  artboard?: string;
  stateMachine?: string;
}

/** A single-quoted JS string literal. */
const q = (s: string) =>
  `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

function riveOptions({
  src,
  artboard,
  stateMachine,
}: SnippetOptions): string[] {
  return [
    `src: ${q(src)}`,
    ...(artboard ? [`artboard: ${q(artboard)}`] : []),
    ...(stateMachine ? [`stateMachines: ${q(stateMachine)}`] : []),
  ];
}

/**
 * "Copy embed snippet": the code to show this file with the chosen artboard
 * and state machine, for `@rive-app/react-canvas` or `@rive-app/canvas`.
 */
export function embedSnippet(opts: SnippetOptions): string {
  const options = riveOptions(opts);
  if (opts.runtime === 'react')
    return [
      "import { useRive } from '@rive-app/react-canvas';",
      '',
      'export function Animation() {',
      `  const { RiveComponent } = useRive({ ${[...options, 'autoplay: true'].join(', ')} });`,
      '  return <RiveComponent />;',
      '}',
      '',
    ].join('\n');
  return [
    '<canvas id="rive-canvas" width="500" height="500"></canvas>',
    '<script type="module">',
    "  import { Rive } from '@rive-app/canvas';",
    '',
    '  const rive = new Rive({',
    ...options.map((o) => `    ${o},`),
    "    canvas: document.getElementById('rive-canvas'),",
    '    autoplay: true,',
    '    onLoad: () => rive.resizeDrawingSurfaceToCanvas(),',
    '  });',
    '</script>',
    '',
  ].join('\n');
}
