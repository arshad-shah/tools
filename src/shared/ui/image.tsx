import { useBlobUrl, useObjectUrl } from '@/shared/lib/object-url';
import { cn } from '@/shared/lib/cn';

type ImageSource =
  | { src: string; mime?: undefined }
  | { src: Blob; mime?: undefined }
  | { src: Uint8Array; mime: string };

/** Exactly one of a text alternative or `decorative`. */
type ImageAlt =
  | { alt: string; decorative?: false }
  | { decorative: true; alt?: undefined };

export type ImageProps = ImageSource &
  ImageAlt & {
    fit?: 'contain' | 'cover';
    /** width / height of the box. */
    aspect?: number;
    className?: string;
    onLoad?(e: React.SyntheticEvent<HTMLImageElement>): void;
    onError?(e: React.SyntheticEvent<HTMLImageElement>): void;
    title?: string;
    draggable?: boolean;
    'data-testid'?: string;
  };

const FIT = { contain: 'object-contain', cover: 'object-cover' } as const;

/**
 * Object-URL-safe image (spec §4.6): bytes and Blobs get an object URL that
 * is revoked when the source changes and on unmount.
 */
export function Image(props: ImageProps) {
  const { src, fit, aspect, className, onLoad, onError, title, draggable } =
    props;
  const bytes = src instanceof Uint8Array ? src : null;
  const bytesUrl = useObjectUrl(
    bytes,
    props.mime ?? 'application/octet-stream',
  );
  const blobUrl = useBlobUrl(src instanceof Blob ? src : null);
  const url = typeof src === 'string' ? src : (bytesUrl ?? blobUrl);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={props.decorative ? '' : props.alt}
      aria-hidden={props.decorative ? true : undefined}
      onLoad={onLoad}
      onError={onError}
      title={title}
      draggable={draggable}
      data-testid={props['data-testid']}
      className={cn('block max-w-full', fit && FIT[fit], className)}
      style={aspect ? { aspectRatio: aspect } : undefined}
    />
  );
}
Image.displayName = 'Image';
