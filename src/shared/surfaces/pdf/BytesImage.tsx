import { useEffect, useMemo, type SyntheticEvent } from 'react';

/**
 * Image bytes drawn filling their box on a page (a placed image or an image
 * watermark). Decorative: the object around it carries the name.
 */
export function BytesImage({
  bytes,
  mime,
  fit = 'fill',
  label,
  onLoad,
}: {
  bytes: Uint8Array;
  mime: string;
  fit?: 'fill' | 'cover' | 'contain';
  /** Accessible name; leave out when the object around it is named. */
  label?: string;
  onLoad?(e: SyntheticEvent<HTMLImageElement>): void;
}) {
  const url = useMemo(
    () => URL.createObjectURL(new Blob([bytes.slice()], { type: mime })),
    [bytes, mime],
  );
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <img
      src={url}
      alt={label ?? ''}
      draggable={false}
      onLoad={onLoad}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: fit,
      }}
    />
  );
}
