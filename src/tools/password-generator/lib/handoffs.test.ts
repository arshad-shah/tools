import { describe, expect, it } from 'vitest';
import type { ToolManifest } from '@/app/tool';
import { passwordTargets, SECRET_MIME } from './handoffs';

const tool = (id: string, mimes: string[]) =>
  ({ id, enabled: true, accepts: [{ mimes }] }) as unknown as ToolManifest;

describe('passwordTargets', () => {
  it('lists only tools that accept the mime', () => {
    const tools = [
      tool('pdf-protect', []),
      tool('text-encrypt', [SECRET_MIME]),
      tool('hash-generator', ['text/plain']),
    ];
    const out = passwordTargets('pw', tools);
    expect(out.map((t) => t.toolId)).toEqual([
      'text-encrypt',
      'hash-generator',
    ]);
    expect(out[0].payload).toMatchObject({ mime: SECRET_MIME, text: 'pw' });
  });
  it('uses the registry by default (Hash accepts text)', () => {
    expect(passwordTargets('pw').map((t) => t.toolId)).toContain(
      'hash-generator',
    );
  });
});
