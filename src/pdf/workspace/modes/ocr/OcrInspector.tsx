import { useEffect } from 'react';
import { Button, Stack, Text } from '@arshad-shah/cynosure';
import { ocrScan, trash } from '@arshad-shah/cynosure/icons';
import { InspectorSection } from '../../ui/InspectorSection';
import { ErrorNotice } from '../../ui/states';
import type { ModeProps } from '../types';
import {
  latestOcr,
  loadManifest,
  refreshCached,
  removeData,
  runOcr,
  setLanguages,
} from './actions';
import { ConsentCard } from './ConsentCard';
import { OcrReport } from './OcrReport';
import { setOcrUi, useOcrUi } from './ui-store';

const RETRY = new Set(['NETWORK', 'WORKER_CRASHED']);

/**
 * OCR's pinned panel: the consent card (spec 11 "First use"), a failed
 * run with "Try again", the last report, and removing the stored data.
 */
export function OcrInspector({ doc, selection }: ModeProps) {
  const ui = useOcrUi();
  useEffect(() => {
    void loadManifest();
    void refreshCached();
  }, []);
  const run = () => void runOcr(doc, selection.pages);
  const hasReport = !!latestOcr(doc.state);

  return (
    <>
      {ui.error ? (
        <ErrorNotice
          error={ui.error}
          actions={
            RETRY.has(ui.error.code)
              ? [{ label: 'Try again', onClick: run, primary: true }]
              : [{ label: 'Close', onClick: () => setOcrUi({ error: null }) }]
          }
        />
      ) : null}
      {ui.dismissed ? (
        <Stack gap="2" align="start">
          <Text size="sm" tone="muted">
            Nothing is downloaded until you choose Download and run.
          </Text>
          <Button
            variant="outline"
            size="sm"
            icon={ocrScan}
            onClick={() => setOcrUi({ dismissed: false })}
          >
            Show OCR options
          </Button>
        </Stack>
      ) : (
        <ConsentCard
          manifest={ui.manifest}
          langs={ui.langs}
          onLangsChange={setLanguages}
          cached={ui.cached}
          busy={ui.running}
          onRun={run}
          onDismiss={() => setOcrUi({ dismissed: true })}
        />
      )}
      {hasReport ? (
        <InspectorSection title="Report">
          <OcrReport doc={doc} />
        </InspectorSection>
      ) : null}
      <InspectorSection title="OCR data on this device" defaultOpen={false}>
        <Stack gap="2" align="start">
          <Text size="sm" tone="muted">
            Language data is kept in this browser so OCR works offline next
            time. The engine stays in the browser cache until it clears it.
          </Text>
          <Button
            variant="outline"
            tone="danger"
            size="sm"
            icon={trash}
            disabled={ui.running}
            onClick={() => void removeData(doc)}
          >
            Remove OCR data
          </Button>
        </Stack>
      </InspectorSection>
    </>
  );
}
