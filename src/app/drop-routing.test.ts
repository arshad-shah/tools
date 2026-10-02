import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { routeDrop, routePdfHubDrop } from './drop-routing';
import { TOOLS } from './registry';

const f = (content: BlobPart, name = 'f') => new File([content], name);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = () => f('%PDF-1.7\n%%EOF', 'a.pdf');
const csv = () => f('a,b\n1,2\n3,4\n', 'a.csv');

describe('routeDrop', () => {
  it('sends one CSV on the data hub to the CSV viewer', async () => {
    expect(await routeDrop([csv()], TOOLS, 'data')).toMatchObject({
      type: 'navigate',
      path: '/data/csv',
    });
  });
  it('does not send a CSV on the text hub anywhere', async () => {
    const d = await routeDrop([csv()], TOOLS, 'text');
    expect(d.type).toBe('error');
  });
  it('sends two text files on the text hub to the diff checker', async () => {
    expect(
      await routeDrop([f('one\ntwo'), f('three\nfour')], TOOLS, 'text'),
    ).toMatchObject({ type: 'navigate', path: '/text/diff' });
  });
  it('sends three PNGs on the media hub to the image optimizer', async () => {
    expect(
      await routeDrop([f(PNG), f(PNG), f(PNG)], TOOLS, 'media'),
    ).toMatchObject({ type: 'navigate', path: '/media/image-optimizer' });
  });
  it('offers a choice for a PDF on the security hub', async () => {
    const d = await routeDrop([pdf()], TOOLS, 'security');
    expect(d.type).toBe('choose');
    if (d.type !== 'choose') return;
    expect(d.options.map((o) => o.path).sort()).toEqual([
      '/pdf/protect',
      '/pdf/unlock',
      '/security/encrypt',
      '/security/hash',
    ]);
  });
  it('sends two PDFs on the PDF hub to merge', async () => {
    expect(await routeDrop([pdf(), pdf()], TOOLS, 'pdf')).toMatchObject({
      type: 'navigate',
      path: '/pdf/merge',
    });
  });
  it('names accepted kinds when nothing matches', async () => {
    const d = await routeDrop(
      [f(new Uint8Array([0xff, 0xfe, 0x00, 0xc3, 0x28]))],
      TOOLS,
      'data',
    );
    expect(d.type).toBe('error');
    if (d.type !== 'error') return;
    expect(d.error).toBeInstanceOf(ToolError);
    expect(d.error.code).toBe('INVALID_FILE');
    expect(d.error.message).toBe(
      'No tool here accepts these files. Accepted: CSV, TSV, JSON, XML or text',
    );
  });
  it('ignores disabled tools', async () => {
    const tools = TOOLS.map((t) =>
      t.id === 'csv-viewer' ? { ...t, enabled: false } : t,
    );
    expect((await routeDrop([csv()], tools, 'data')).type).toBe('error');
  });
  it('rejects an empty drop', async () => {
    expect((await routeDrop([], TOOLS, 'data')).type).toBe('error');
  });
});

describe('routePdfHubDrop', () => {
  const route = (files: File[]) => routePdfHubDrop(files, TOOLS);
  it('opens one PDF in the workspace', async () => {
    expect(await route([pdf()])).toMatchObject({
      type: 'navigate',
      path: '/pdf/edit',
    });
  });
  it('merges several PDFs', async () => {
    expect(await route([pdf(), pdf()])).toMatchObject({
      type: 'navigate',
      path: '/pdf/merge',
    });
  });
  it('turns images into a PDF', async () => {
    expect(await route([f(PNG), f(PNG)])).toMatchObject({
      type: 'navigate',
      path: '/pdf/images-to-pdf',
    });
  });
  it('asks before converting images to merge them with PDFs', async () => {
    expect(await route([pdf(), f(PNG)])).toEqual({
      type: 'confirm-merge',
      message: 'Convert the images and merge everything?',
      path: '/pdf/merge',
      files: expect.any(Array),
    });
  });
  it('refuses other files', async () => {
    expect((await route([csv()])).type).toBe('error');
  });
});
