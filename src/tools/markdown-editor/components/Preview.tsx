import type { Ref } from 'react';
import { SandboxedHtml, type SandboxedHtmlHandle } from '@/shared/ui';

export interface PreviewProps {
  html: string;
  baseCss: string;
  allowRemoteImages: boolean;
  ref?: Ref<SandboxedHtmlHandle>;
}

/**
 * The rendered document in the kit's sandboxed frame: no scripts, no
 * same-origin access, remote images only after the opt-in.
 */
export function Preview({
  html,
  baseCss,
  allowRemoteImages,
  ref,
}: PreviewProps) {
  return (
    <SandboxedHtml
      ref={ref}
      html={html}
      title="Preview"
      baseCss={baseCss}
      allowRemoteImages={allowRemoteImages}
      className="h-screen max-h-180 min-h-96"
    />
  );
}
