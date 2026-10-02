import { useEffect } from 'react';
import { ensureFontFace, fontById } from '@/pdf/sign';
import type { SignPlaceParams } from '@/pdf/doc/ops/fill-sign';
import type { DocumentApi } from '../types';
import { fillSign, type SignaturePreview } from './store';

/** The asset a preview is keyed by; ink and traced signatures need none. */
const assetOf = (p: SignPlaceParams): string | null =>
  p.content.kind === 'image'
    ? p.content.assetId
    : p.content.kind === 'text'
      ? p.content.fontAsset
      : null;

function placed(doc: DocumentApi): SignPlaceParams[] {
  const out: SignPlaceParams[] = [];
  for (const items of doc.view.overlays.values())
    for (const o of items)
      if (o.type === 'sign.place' && !doc.view.hidden.has(o.opId))
        out.push(o.params as SignPlaceParams);
  return out;
}

const addPreview = (asset: string, preview: SignaturePreview) =>
  fillSign.set({
    previews: { ...fillSign.get().previews, [asset]: preview },
  });

/**
 * Signatures placed before a reload have no preview in memory: rebuild it
 * from the document (the stored picture, or the typed text in its font) so
 * the page shows the signature, not a placeholder frame.
 */
export function useRestoredPreviews(doc: DocumentApi): void {
  const missing = placed(doc).filter((p) => {
    const asset = assetOf(p);
    return asset !== null && !fillSign.get().previews[asset];
  });
  const key = missing.map(assetOf).join(' ');
  useEffect(() => {
    if (!key) return;
    let live = true;
    for (const p of missing) {
      const c = p.content;
      if (c.kind === 'text') {
        if (typeof FontFace !== 'undefined')
          void ensureFontFace(c.fontId).catch(() => {});
        addPreview(c.fontAsset, {
          kind: 'text',
          text: c.text,
          family: fontById(c.fontId).family,
          color: c.color,
          slant: c.slant,
        });
        continue;
      }
      if (c.kind !== 'image') continue;
      doc.assetBytes(c.assetId).then(
        (bytes) => {
          if (live)
            addPreview(c.assetId, { kind: 'image', bytes, mime: c.mime });
        },
        // An asset gone from this device keeps the labelled frame.
        () => {},
      );
    }
    return () => {
      live = false;
    };
    // One pass per set of missing assets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
