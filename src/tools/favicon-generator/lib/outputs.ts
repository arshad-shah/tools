import { writeIco } from './ico';
import { buildManifest, htmlSnippet, type ManifestInput } from './manifest';
import { renderIcon, type IconSource } from './render';

/** The maskable safe zone: content stays within the middle 80%. */
export const MASKABLE_PADDING = 0.1;

export const PNG_OUTPUTS = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
] as const;

export const ICO_SIZES = [16, 32, 48] as const;

export interface FaviconFile {
  name: string;
  bytes: Uint8Array;
}

const bytesOf = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/**
 * Every output of spec §9.9: favicon.ico (16, 32, 48), favicon.svg (SVG
 * sources only), the Apple touch icon, the 192 and 512 icons, the maskable
 * 512, site.webmanifest and the link tags (link-tags.html). Browser only (renders on OffscreenCanvas).
 */
export async function buildFavicons(
  source: IconSource,
  manifest: ManifestInput,
): Promise<FaviconFile[]> {
  const ico = await Promise.all(
    ICO_SIZES.map(async (size) => ({
      size,
      bytes: await bytesOf(await renderIcon(source, size)),
    })),
  );
  const files: FaviconFile[] = [{ name: 'favicon.ico', bytes: writeIco(ico) }];
  if (source.kind === 'svg')
    files.push({
      name: 'favicon.svg',
      bytes: new TextEncoder().encode(source.svg),
    });
  for (const out of PNG_OUTPUTS)
    files.push({
      name: out.name,
      bytes: await bytesOf(await renderIcon(source, out.size)),
    });
  files.push({
    name: 'icon-maskable-512.png',
    bytes: await bytesOf(
      await renderIcon(source, 512, {
        maskablePadding: MASKABLE_PADDING,
        background:
          source.kind === 'text' ? source.bg : manifest.backgroundColor,
      }),
    ),
  });
  files.push({
    name: 'site.webmanifest',
    bytes: new TextEncoder().encode(buildManifest(manifest)),
  });
  files.push({
    name: 'link-tags.html',
    bytes: new TextEncoder().encode(
      htmlSnippet({ svg: source.kind === 'svg' }),
    ),
  });
  return files;
}

export { htmlSnippet };
