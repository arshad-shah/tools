import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { imageSaver, streamZip } from './zip-stream';

const bytes = (...v: number[]) => Uint8Array.from(v);

describe('streamZip', () => {
  it('builds a stored ZIP from files added one at a time', async () => {
    const zip = streamZip();
    zip.add('a.png', bytes(1, 2, 3));
    zip.add('b.png', bytes(4, 5));
    const blob = await zip.finish();
    expect(blob.type).toBe('application/zip');
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(files)).toEqual(['a.png', 'b.png']);
    expect([...files['b.png']]).toEqual([4, 5]);
  });
});

describe('imageSaver', () => {
  it('saves a single image as itself', async () => {
    const saver = imageSaver('image/png', 'all.zip');
    saver.add({ name: 'p1.png', data: bytes(9) });
    const out = await saver.finish();
    expect(out.name).toBe('p1.png');
    expect(out.blob.type).toBe('image/png');
    expect(out.count).toBe(1);
  });

  it('streams two or more images into a ZIP', async () => {
    const saver = imageSaver('image/png', 'all.zip');
    saver.add({ name: 'p1.png', data: bytes(1) });
    saver.add({ name: 'p2.png', data: bytes(2) });
    saver.add({ name: 'p3.png', data: bytes(3) });
    const out = await saver.finish();
    expect(out.name).toBe('all.zip');
    expect(out.count).toBe(3);
    const files = unzipSync(new Uint8Array(await out.blob.arrayBuffer()));
    expect(Object.keys(files)).toEqual(['p1.png', 'p2.png', 'p3.png']);
  });
});
