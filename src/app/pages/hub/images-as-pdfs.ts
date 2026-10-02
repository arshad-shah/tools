import { readBytes, detectKind } from '@/shared/lib/files';
import { ToolError } from '@/shared/lib/errors';
import { convertToPng } from '@/shared/lib/image-convert';

/**
 * Mixed drops on the PDF hub: each image becomes a one-page PDF (fit to the
 * image) so Merge can take every file. PDFs pass through unchanged.
 */
export async function imagesAsPdfs(files: File[]): Promise<File[]> {
  const { imagesToPdf } = await import('@/pdf/edit/images');
  return Promise.all(
    files.map(async (file) => {
      const bytes = await readBytes(file);
      const kind = detectKind(bytes);
      if (kind === 'pdf') return file;
      if (!kind)
        throw new ToolError('INVALID_FILE', `${file.name} is not an image`);
      const image =
        kind === 'png' || kind === 'jpeg'
          ? { bytes, kind, name: file.name }
          : {
              bytes: await convertToPng(bytes, kind, file.name),
              kind: 'png' as const,
              name: file.name,
            };
      const pdf = await imagesToPdf([image], {
        pageSize: 'fit',
        orientation: 'auto',
        marginPt: 0,
      });
      const name = file.name.replace(/\.[^.]+$/, '') + '.pdf';
      return new File([pdf as Uint8Array<ArrayBuffer>], name, {
        type: 'application/pdf',
      });
    }),
  );
}
