import { describe, expect, it } from 'vitest';
import { describeBytes } from './insight';
import { sendTargets } from './send-targets';

const ascii = (s: string) => new TextEncoder().encode(s);

/** A PNG signature plus an IHDR chunk header for the given size. */
function pngHeader(w: number, h: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const d = new DataView(b.buffer);
  d.setUint32(8, 13);
  b.set(ascii('IHDR'), 12);
  d.setUint32(16, w);
  d.setUint32(20, h);
  return b;
}

const b64url = (s: string) =>
  btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('describeBytes', () => {
  it('reads the PNG size from the IHDR', () => {
    expect(describeBytes(pngHeader(32, 32))).toMatchObject({
      label: 'Image (PNG 32x32)',
      kind: 'image',
      mime: 'image/png',
    });
  });
  it('reads the GIF size', () => {
    const gif = ascii('GIF89a\x10\0\x08\0');
    expect(describeBytes(gif).label).toBe('Image (GIF 16x8)');
  });
  it('recognises JSON', () => {
    expect(describeBytes(ascii('{"a":1}'))).toMatchObject({
      kind: 'json',
      label: 'JSON',
      details: 'Object with 1 key',
    });
  });
  it('recognises a JWT', () => {
    const jwt = [
      b64url('{"alg":"HS256","typ":"JWT"}'),
      b64url('{"sub":"1"}'),
      'c2ln',
    ].join('.');
    expect(describeBytes(ascii(jwt))).toMatchObject({
      kind: 'jwt',
      label: 'JWT',
    });
  });
  it('calls gzip an archive', () => {
    expect(describeBytes(new Uint8Array([0x1f, 0x8b, 8, 0])).kind).toBe(
      'archive',
    );
  });
  it('falls back to text, then binary', () => {
    expect(describeBytes(ascii('hello\nworld'))).toMatchObject({
      kind: 'text',
      details: '11 characters, 2 lines',
    });
    expect(describeBytes(new Uint8Array([0, 1, 2, 250])).kind).toBe('binary');
  });
});

describe('sendTargets', () => {
  it('maps insights to tools', () => {
    expect(sendTargets(describeBytes(ascii('{"a":1}')))[0].toolId).toBe(
      'json-and-xml-viewer',
    );
    expect(sendTargets(describeBytes(pngHeader(1, 1)))[0].toolId).toBe(
      'image-optimizer',
    );
    expect(sendTargets(describeBytes(ascii('plain')))).toEqual([]);
  });
});
