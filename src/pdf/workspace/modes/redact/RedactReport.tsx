import { Button, List, Notice, Stack, Text } from '@arshad-shah/cynosure';
import { filePixels, ocrScan, shieldCheck } from '@arshad-shah/cynosure/icons';
import { useGoToMode } from '../../workspace-context';
import type { DocumentApi } from '../types';
import { latestRedaction } from './marks';

/** Inspector view of the last apply: lines, pages turned into images, scrubbed items. */
export function RedactReport({ doc }: { doc: DocumentApi }) {
  const latest = latestRedaction(doc);
  const goToMode = useGoToMode();
  if (!latest) return null;
  const { report } = latest;
  return (
    <Stack gap="3" aria-label="Redaction report">
      <Notice tone="success" size="sm" icon={shieldCheck} title={report.title}>
        <List
          size="sm"
          gap="sm"
          items={report.lines.map((l) => ({ id: l, label: l }))}
        />
      </Notice>
      {report.warnings.map((w) => (
        <Notice
          key={w}
          tone="warning"
          size="sm"
          icon={filePixels}
          title="Turned into an image"
        >
          {w}
        </Notice>
      ))}
      {report.rasterisedPages?.length && goToMode ? (
        <Stack gap="1" align="start">
          <Button
            variant="outline"
            size="sm"
            icon={ocrScan}
            onClick={() => goToMode('ocr')}
          >
            Run OCR
          </Button>
          <Text size="sm" tone="muted">
            Pages turned into images have no text to search or select.
          </Text>
        </Stack>
      ) : null}
    </Stack>
  );
}
