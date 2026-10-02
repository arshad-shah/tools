import { describe, expect, it } from 'vitest';
import { toolsAccepting } from '@/app/registry';
import { DIFF_PAIR_MIME, diffPairPayload, readDiffHandoff } from './handoff';

describe('readDiffHandoff', () => {
  it('fills both sides from a pair payload', () => {
    const p = diffPairPayload(
      { left: 'a', right: 'b', leftName: 'x.json' },
      'code-formatter',
    );
    expect(readDiffHandoff(p)).toEqual({
      left: 'a',
      right: 'b',
      leftName: 'x.json',
      rightName: undefined,
    });
  });

  it('fills the side named in meta, left by default', () => {
    const base = {
      kind: 'text',
      mime: 'text/plain',
      text: 't',
      sourceTool: 's',
    } as const;
    expect(readDiffHandoff({ ...base, meta: { side: 'right' } })).toEqual({
      right: 't',
      rightName: undefined,
    });
    expect(readDiffHandoff(base)).toEqual({ left: 't', leftName: undefined });
  });

  it('refuses a damaged pair and file payloads', () => {
    expect(
      readDiffHandoff({
        kind: 'text',
        mime: 'application/vnd.tools.diff-pair+json',
        text: '{',
        sourceTool: 's',
      }),
    ).toBeNull();
    expect(readDiffHandoff({ kind: 'files', files: [] })).toBeNull();
  });

  it('Text Diff accepts the pair mime (registry)', () => {
    expect(toolsAccepting(DIFF_PAIR_MIME).map((t) => t.id)).toContain(
      'text-diff-checker',
    );
  });

  it("fills both sides from HTTP Client's Compare with previous response", () => {
    // The payload api-request/components/ResponsePanel.tsx sends.
    const p = {
      kind: 'text',
      mime: 'application/vnd.tools.diff-pair+json',
      sourceTool: 'api-request',
      text: JSON.stringify({ left: '{"v":1}', right: '{"v":2}' }),
      meta: { pair: true },
    } as const;
    expect(readDiffHandoff(p)).toEqual({
      left: '{"v":1}',
      right: '{"v":2}',
      leftName: undefined,
      rightName: undefined,
    });
  });
});
