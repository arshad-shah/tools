import { Alert, AlertTitle, Stack, Text } from '@/shared/ui';
import { IconRasterised, IconRedactVerified } from '@/shared/ui/icons';
import type { DocumentApi } from '../types';
import { latestRedaction } from './marks';

/** Inspector view of the last apply: lines, pages turned into images, scrubbed items. */
export function RedactReport({ doc }: { doc: DocumentApi }) {
  const latest = latestRedaction(doc);
  if (!latest) return null;
  const { report } = latest;
  return (
    <Stack gap="2" aria-label="Redaction report">
      <div className="flex items-center gap-2 text-accent-fg">
        <IconRedactVerified size="sm" />
        <Text size="sm" weight="semibold">
          {report.title}
        </Text>
      </div>
      <ul className="flex flex-col gap-1 text-sm text-fg-muted">
        {report.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {report.warnings.map((w) => (
        <Alert key={w} status="warning" icon={<IconRasterised size="sm" />}>
          <AlertTitle>Turned into an image</AlertTitle>
          <Text size="sm">{w}</Text>
        </Alert>
      ))}
    </Stack>
  );
}
