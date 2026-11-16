import { Badge, Inline } from '@arshad-shah/cynosure';
import type { RiveInfo } from '../types';

/** The artboard count (the name and size are in the card's description). */
export function FileInfo({
  filename,
  riveInfo,
}: {
  filename: string | null;
  fileSize: string | null;
  riveInfo: RiveInfo | null;
}) {
  if (!filename || !riveInfo) return null;
  return (
    <Inline gap="2" wrap>
      {riveInfo.artboardCount > 0 ? (
        <Badge tone="accent">{`Artboards: ${riveInfo.artboardCount}`}</Badge>
      ) : null}
    </Inline>
  );
}
