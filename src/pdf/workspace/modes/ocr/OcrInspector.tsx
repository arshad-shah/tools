import { useEffect } from 'react';
import { Button, ErrorState, InspectorSection, Stack, Text } from '@/shared/ui';
import { IconOcrScan, IconTrash } from '@/shared/ui/icons';
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
        <ErrorState
          error={ui.error}
          headingLevel={3}
          actions={
            RETRY.has(ui.error.code)
              ? [{ label: 'Try again', onClick: run, variant: 'primary' }]
              : [
                  {
                    label: 'Close',
                    onClick: () => setOcrUi({ error: null }),
                    variant: 'secondary',
                  },
                ]
          }
        />
      ) : null}
      {ui.dismissed ? (
        <Stack gap="2" className="p-1">
          <Text size="sm" tone="muted">
            Nothing is downloaded until you choose Download and run.
          </Text>
          <div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconOcrScan size="sm" />}
              onClick={() => setOcrUi({ dismissed: false })}
            >
              Show OCR options
            </Button>
          </div>
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
        <Stack gap="2">
          <Text size="sm" tone="muted">
            Language data is kept in this browser so OCR works offline next
            time. The engine stays in the browser cache until it clears it.
          </Text>
          <div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconTrash size="sm" />}
              disabled={ui.running}
              onClick={() => void removeData(doc)}
            >
              Remove OCR data
            </Button>
          </div>
        </Stack>
      </InspectorSection>
    </>
  );
}
