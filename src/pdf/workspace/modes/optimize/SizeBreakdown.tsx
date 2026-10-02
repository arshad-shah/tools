import { useEffect, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import {
  Button,
  ErrorState,
  Inline,
  List,
  ListItem,
  LoadingState,
  MetaList,
  Progress,
  Stack,
  Text,
} from '@/shared/ui';
import { IconArrowRight } from '@/shared/ui/icons';
import type { SizeBreakdown } from '@/pdf/edit/size-breakdown';
import type { PageId } from '@/pdf/doc/types';
import { useWorkspace } from '../../workspace-context';
import type { ModeProps } from '../types';
import { documentBreakdown } from './breakdown';

const CATEGORIES = [
  ['images', 'Images'],
  ['fonts', 'Fonts'],
  ['content', 'Page content'],
  ['other', 'Structure and other'],
] as const;

const percent = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';

export interface SizeBreakdownViewProps {
  data: SizeBreakdown;
  /** View page ids by materialised page index. */
  pageIds: readonly PageId[];
  onGoToPage(id: PageId): void;
}

/** Bytes per category with bars, the largest images and the fonts. */
export function SizeBreakdownView({
  data,
  pageIds,
  onGoToPage,
}: SizeBreakdownViewProps) {
  return (
    <Stack gap="4">
      <Text size="sm">Total {formatBytes(data.total)}</Text>
      <Stack gap="3">
        {CATEGORIES.map(([key, label]) => (
          <Stack key={key} gap="1">
            <Inline justify="between" gap="2">
              <Text size="sm">{label}</Text>
              <Text size="sm" tone="muted" className="font-mono">
                {formatBytes(data[key])} ({percent(data[key], data.total)})
              </Text>
            </Inline>
            <Progress
              value={data[key]}
              max={Math.max(1, data.total)}
              label={`${label}: ${formatBytes(data[key])} of ${formatBytes(data.total)}`}
            />
          </Stack>
        ))}
      </Stack>
      <Stack gap="2">
        <Text size="sm" weight="semibold" id="opt-largest-images">
          Largest images
        </Text>
        {data.largestImages.length === 0 ? (
          <Text size="sm" tone="muted">
            This document has no images.
          </Text>
        ) : (
          <List aria-labelledby="opt-largest-images">
            {data.largestImages.map((img, i) => {
              const id = img.page >= 0 ? pageIds[img.page] : undefined;
              return (
                <ListItem key={i}>
                  <Stack gap="1">
                    <MetaList
                      items={[
                        formatBytes(img.bytes),
                        `${img.width} by ${img.height} px`,
                      ]}
                    />
                    {id ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        rightIcon={<IconArrowRight size="sm" />}
                        onClick={() => onGoToPage(id)}
                      >
                        Go to page {img.page + 1}
                      </Button>
                    ) : null}
                  </Stack>
                </ListItem>
              );
            })}
          </List>
        )}
      </Stack>
      <Stack gap="2">
        <Text size="sm" weight="semibold" id="opt-fonts">
          Fonts
        </Text>
        {data.fontList.length === 0 ? (
          <Text size="sm" tone="muted">
            This document has no fonts.
          </Text>
        ) : (
          <List aria-labelledby="opt-fonts">
            {data.fontList.map((f, i) => (
              <ListItem key={i}>
                <Stack gap="1">
                  <Text size="sm" className="break-all">
                    {f.name}
                  </Text>
                  <MetaList
                    items={[
                      f.embedded ? formatBytes(f.bytes) : 'Not embedded',
                      ...(f.subset ? ['Subset'] : []),
                    ]}
                  />
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Stack>
  );
}

type Result =
  | { key: string; data: SizeBreakdown; error: null }
  | { key: string; data: null; error: ToolError };

/** Measures the document as it is now; again after every change or on refresh. */
export function SizeBreakdownPanel({
  doc,
  refresh = 0,
}: Pick<ModeProps, 'doc'> & { refresh?: number }) {
  const ws = useWorkspace();
  const key = `${doc.view.checkpoint}:${doc.state.cursor}:${doc.state.log.length}:${refresh}`;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const c = new AbortController();
    documentBreakdown(ws.session, c.signal).then(
      (data) => !c.signal.aborted && setResult({ key, data, error: null }),
      (e) =>
        !c.signal.aborted &&
        setResult({ key, data: null, error: toToolError(e) }),
    );
    return () => c.abort();
  }, [key, ws.session]);

  if (!result || result.key !== key)
    return <LoadingState label="Measuring the document" />;
  if (result.error) return <ErrorState error={result.error} headingLevel={4} />;
  return (
    <SizeBreakdownView
      data={result.data}
      pageIds={doc.view.pages.map((p) => p.id)}
      onGoToPage={ws.goToPage}
    />
  );
}
