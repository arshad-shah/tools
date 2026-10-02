import { describe, expect, it } from 'vitest';
import { embedSnippet } from './snippet';

describe('embedSnippet', () => {
  it('React: useRive with the artboard and state machine', () => {
    const out = embedSnippet({
      runtime: 'react',
      src: '/anim/hero.riv',
      artboard: 'Main',
      stateMachine: 'SM',
    });
    expect(out).toContain("import { useRive } from '@rive-app/react-canvas';");
    expect(out).toContain(
      "useRive({ src: '/anim/hero.riv', artboard: 'Main', stateMachines: 'SM', autoplay: true })",
    );
  });

  it('Web: a canvas and a Rive instance', () => {
    const out = embedSnippet({
      runtime: 'web',
      src: 'a.riv',
      artboard: 'Main',
    });
    expect(out).toContain("import { Rive } from '@rive-app/canvas';");
    expect(out).toContain("    src: 'a.riv',");
    expect(out).toContain("    artboard: 'Main',");
    expect(out).not.toContain('stateMachines');
  });

  it('escapes quotes in names', () => {
    expect(
      embedSnippet({ runtime: 'react', src: "it's.riv", artboard: 'A\\B' }),
    ).toContain("src: 'it\\'s.riv', artboard: 'A\\\\B'");
  });
});
