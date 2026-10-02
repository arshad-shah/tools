import { describe, expect, it } from 'vitest';
import { toolsAccepting } from '@/app/registry';
import { readDiffHandoff } from '@/tools/text-diff-checker/lib/handoff';
import { decodeJwt } from './jwt';
import {
  claimToEpoch,
  comparePayloads,
  isTokenHandoff,
  payloadToJson,
  sortedJson,
} from './handoffs';

const b64url = (o: object) =>
  btoa(JSON.stringify(o))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const token = (payload: object) =>
  decodeJwt(`${b64url({ alg: 'HS256' })}.${b64url(payload)}.c2ln`);

describe('jwt hand-offs', () => {
  it('sorts keys at every level', () => {
    expect(sortedJson({ b: 1, a: { d: 1, c: [{ f: 1, e: 2 }] } })).toBe(
      JSON.stringify({ a: { c: [{ e: 2, f: 1 }], d: 1 }, b: 1 }, null, 2),
    );
  });
  it('builds the compare pair with sorted-key JSON', () => {
    const p = comparePayloads(token({ z: 1, a: 2 }), token({ a: 3 }));
    expect(p).toMatchObject({
      kind: 'text',
      mime: 'application/vnd.tools.diff-pair+json',
      meta: { pair: true },
    });
    const pair = JSON.parse(p.kind === 'text' ? p.text : '');
    expect(pair.left).toBe('{\n  "a": 2,\n  "z": 1\n}');
    expect(pair.right).toBe('{\n  "a": 3\n}');
  });
  it('sends the payload and time claims', () => {
    const t = token({ sub: '1', exp: 1700000000 });
    expect(payloadToJson(t)).toMatchObject({ mime: 'application/json' });
    expect(claimToEpoch(t, 'exp')).toMatchObject({ text: '1700000000' });
    expect(claimToEpoch(t, 'iat')).toBeNull();
    expect(
      isTokenHandoff({
        kind: 'text',
        mime: 'application/jwt',
        text: 'x',
        sourceTool: 'a',
      }),
    ).toBe(true);
  });

  it('Text Diff takes the compare pair and Epoch takes the time claims', () => {
    const p = comparePayloads(token({ a: 1 }), token({ a: 2 }));
    const accepting = (mime: string) => toolsAccepting(mime).map((t) => t.id);
    expect(accepting(p.kind === 'text' ? p.mime : '')).toContain(
      'text-diff-checker',
    );
    expect(readDiffHandoff(p)).toMatchObject({
      left: '{\n  "a": 1\n}',
      right: '{\n  "a": 2\n}',
    });
    const epoch = claimToEpoch(token({ exp: 1700000000 }), 'exp')!;
    expect(accepting(epoch.kind === 'text' ? epoch.mime : '')).toContain(
      'epoch-converter',
    );
  });
});
