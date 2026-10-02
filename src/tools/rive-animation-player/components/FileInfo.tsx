import { Badge, Inline } from '@/shared/ui';
import type { RiveInfo } from '../types';

/** File name, size and artboard-count badges. */
export function FileInfo({
  filename,
  fileSize,
  riveInfo,
}: {
  filename: string | null;
  fileSize: string | null;
  riveInfo: RiveInfo | null;
}) {
  return (
    <>
      {filename && riveInfo && (
        <Inline gap="2" wrap>
          <Badge variant="soft" tone="accent" size="sm">
            File: {filename}
          </Badge>
          {fileSize && (
            <Badge variant="soft" tone="accent" size="sm">
              Size: {fileSize}
            </Badge>
          )}
          {riveInfo.artboardCount > 0 && (
            <Badge variant="soft" tone="accent" size="sm">
              Artboards: {riveInfo.artboardCount}
            </Badge>
          )}
        </Inline>
      )}
    </>
  );
}
