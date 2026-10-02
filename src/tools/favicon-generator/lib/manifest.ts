export interface ManifestInput {
  name: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
}

/** `site.webmanifest` with the 192 and 512 icons and the maskable one. */
export function buildManifest({
  name,
  shortName,
  themeColor,
  backgroundColor,
}: ManifestInput): string {
  const manifest = {
    name: name.trim() || 'My app',
    short_name: shortName.trim() || name.trim() || 'App',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    theme_color: themeColor,
    background_color: backgroundColor,
    display: 'standalone',
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** The `<link>` tags for the head; the SVG line only when there is one. */
export function htmlSnippet({ svg = true }: { svg?: boolean } = {}): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    ...(svg
      ? ['<link rel="icon" href="/favicon.svg" type="image/svg+xml">']
      : []),
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    '',
  ].join('\n');
}
