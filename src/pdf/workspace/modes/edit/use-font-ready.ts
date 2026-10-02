import { useEffect, useState } from 'react';
import type { ContentFont } from '@/pdf/doc/ops/edit';
import { useTextLayout } from '../../text-layout';
import { ensureOverlayFonts } from '../../overlay-fonts';

/** Whether a font's metrics and preview face are loaded (spec §13.3: spinner while the Unicode font loads). */
export function useFontReady(font: ContentFont): boolean {
  const layout = useTextLayout(
    font === 'unicode'
      ? 'unicode'
      : font === 'Times-Roman'
        ? 'Times-Roman'
        : font === 'Courier'
          ? 'Courier'
          : 'Helvetica',
  );
  const [faces, setFaces] = useState(false);
  useEffect(() => {
    let live = true;
    ensureOverlayFonts().then(
      () => live && setFaces(true),
      () => live && setFaces(true),
    );
    return () => {
      live = false;
    };
  }, []);
  return !!layout && faces;
}

export { useTextLayout };
