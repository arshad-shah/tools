import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Spinner } from '@/shared/ui';
import { useObjectUrl } from '@/shared/lib/object-url';

interface ImageThumbProps {
  bytes: Uint8Array;
  mime: string;
  name: string;
}

export const ImageThumb: React.FC<ImageThumbProps> = ({
  bytes,
  mime,
  name,
}) => {
  const url = useObjectUrl(bytes, mime);
  // Keyed by URL, so a new file gets a fresh chance to load.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url)
    return (
      <span aria-hidden>
        <Spinner size="sm" />
      </span>
    );
  if (failedUrl === url)
    return (
      <span title={`${name} cannot be previewed`}>
        <ImageOff size={20} className="text-danger" aria-hidden />
        <span className="sr-only">{`${name} cannot be previewed`}</span>
      </span>
    );
  return (
    <img
      src={url}
      alt={name}
      onError={() => setFailedUrl(url)}
      className="max-h-14 max-w-14 rounded-sm border border-line object-contain"
    />
  );
};
