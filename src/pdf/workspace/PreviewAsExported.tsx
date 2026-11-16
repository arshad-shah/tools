import { useEffect, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { Inline, Notice, Stack, Text } from '@arshad-shah/cynosure';
import { planFor } from '@/pdf/doc/plan';
import { materializeIn } from '@/pdf/doc/services';
import type { PageId } from '@/pdf/doc/types';
import { usePageBitmap, usePdfDocument } from '@/pdf/render';
import { displaySize } from './page-display';
import { BitmapSurface } from '@/pdf/surfaces/BitmapSurface';
import { PageImage } from '@/pdf/surfaces/PageImage';
import { LoadingLine } from './ui/states';
import type { WorkspaceSession } from './session';

const WIDTH = 260;

/**
 * "Preview page as exported" (spec §6.3 mitigation 2): writes just this page
 * in the edit worker and renders the result beside the live view.
 */
export function PreviewAsExported({
  session,
  pageId,
}: {
  session: WorkspaceSession;
  pageId: PageId;
}) {
  const { model } = session;
  const [result, setResult] = useState<{
    pageId: PageId;
    /** One object per result, so the render worker opens it once. */
    file: { bytes: Uint8Array } | null;
    error: ToolError | null;
  } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    planFor(model, session.blobs, { onlyPages: [pageId] })
      .then((plan) =>
        materializeIn(session.services, plan, { signal: ctrl.signal }),
      )
      .then(
        (out) => setResult({ pageId, file: { bytes: out.bytes }, error: null }),
        (e) => {
          const error = toToolError(e);
          if (error.code !== 'CANCELLED')
            setResult({ pageId, file: null, error });
        },
      );
    return () => ctrl.abort();
  }, [model, session, pageId]);

  const current = result?.pageId === pageId ? result : null;
  const file = current?.file ?? null;
  const { doc } = usePdfDocument(file);
  const pageInfo = doc?.pages[0];
  const pxWidth = Math.round(WIDTH * (window.devicePixelRatio || 1));
  const { bitmap } = usePageBitmap(doc?.docId ?? null, 0, pxWidth, !!doc);

  const view = model.getView();
  const index = view.pages.findIndex((p) => p.id === pageId);
  const page = view.pages[index];
  if (!page) return null;
  const size = displaySize(page, model.getState().sources);
  const handle = page.blank ? null : session.sourceDocs.get(page.source);
  const n = index + 1;

  return (
    <Inline gap="5" wrap align="start">
      <Stack gap="2">
        <PageImage
          page={page}
          sources={model.getState().sources}
          docId={handle?.docId ?? null}
          scale={WIDTH / size.width}
          visible
          priority={0}
          label={`Page ${n} in the workspace`}
        />
        <Text size="sm" tone="muted">
          In the workspace
        </Text>
      </Stack>
      <Stack gap="2">
        {current?.error ? (
          <Notice tone="danger">{current.error.message}</Notice>
        ) : pageInfo ? (
          <BitmapSurface
            bitmap={bitmap}
            width={WIDTH}
            height={(WIDTH * pageInfo.height) / pageInfo.width}
            label={`Page ${n} as exported`}
          />
        ) : (
          <LoadingLine label={`Preparing page ${n} as exported`} />
        )}
        <Text size="sm" tone="muted">
          As exported
        </Text>
      </Stack>
    </Inline>
  );
}
