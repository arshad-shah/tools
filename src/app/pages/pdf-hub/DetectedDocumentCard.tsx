import {
  Badge,
  Button,
  Card,
  IconButton,
  IconTile,
  Inline,
  LoadingDots,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  arrowRight,
  close,
  fileText,
  ocrScan,
  signatureDraw,
} from '@arshad-shah/cynosure/icons';
import { useEffect, useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { PasswordForm } from '@/pdf/ui/PasswordForm';
import {
  preparePdf,
  unlockWithPassword,
  type UnlockEngine,
} from '@/pdf/qpdf/unlock';
import type { PdfRender } from '@/pdf/render';
import type { DetectSummary } from '@/pdf/render/detect-page';
import { stageDocument } from '@/pdf/workspace/workspace-store';

export interface DetectedDocumentCardProps {
  file: { name: string; bytes: Uint8Array };
  render: Pick<PdfRender, 'open' | 'detectSummary' | 'close'>;
  qpdf: UnlockEngine;
  onNavigate(path: string): void;
  onDismiss(): void;
}

type Probe =
  | { kind: 'checking' }
  | { kind: 'locked'; error: string | null; busy: boolean }
  | { kind: 'probing' }
  | { kind: 'done'; summary: DetectSummary }
  | { kind: 'failed' };

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** The pages probed (spec §5.3: the first three, extrapolated). */
const SAMPLE = [0, 1, 2];

/**
 * After a single PDF is dropped on the PDF hub (spec §5.3): the file name and
 * "Open in editor" at once, then a short detection probe that suggests Fill
 * & Sign for flat forms. The probe never blocks; its worker document is
 * closed when the card goes away.
 */
export function DetectedDocumentCard({
  file,
  render,
  qpdf,
  onNavigate,
  onDismiss,
}: DetectedDocumentCardProps) {
  const [probe, setProbe] = useState<Probe>({ kind: 'checking' });
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [wasEncrypted, setWasEncrypted] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    preparePdf(file.bytes, qpdf, ac.signal).then(
      (p) => {
        if (ac.signal.aborted) return;
        if (p.status === 'locked')
          setProbe({ kind: 'locked', error: null, busy: false });
        else {
          setWasEncrypted(p.wasEncrypted);
          setBytes(p.bytes);
        }
      },
      () => !ac.signal.aborted && setProbe({ kind: 'failed' }),
    );
    return () => ac.abort();
  }, [file, qpdf]);

  useEffect(() => {
    if (!bytes) return;
    const ac = new AbortController();
    let docId: string | null = null;
    render
      .open(bytes, ac.signal)
      .then((info) => {
        docId = info.docId;
        return render.detectSummary(info.docId, SAMPLE, ac.signal);
      })
      .then(
        (summary) => !ac.signal.aborted && setProbe({ kind: 'done', summary }),
        () => !ac.signal.aborted && setProbe({ kind: 'failed' }),
      );
    return () => {
      ac.abort();
      if (docId) void render.close(docId).catch(() => {});
    };
  }, [bytes, render]);

  const open = (mode?: string) => {
    const id = stageDocument({
      name: file.name,
      bytes: bytes ?? file.bytes,
      wasEncrypted,
    });
    onNavigate(`/pdf/edit${mode ? `/${mode}` : ''}?open=${id}`);
  };

  const unlock = async (password: string) => {
    setProbe({ kind: 'locked', error: null, busy: true });
    try {
      const plain = await unlockWithPassword(file.bytes, password, qpdf);
      setProbe({ kind: 'probing' });
      setWasEncrypted(true);
      setBytes(plain);
    } catch (e) {
      setProbe({ kind: 'locked', error: toToolError(e).message, busy: false });
    }
  };

  const s = probe.kind === 'done' ? probe.summary : null;
  const meta = s
    ? [
        plural(s.pageCount, 'page'),
        ...(s.flatForm ? ['Flat form'] : []),
        ...(s.estimatedFields > 0
          ? [`${plural(s.estimatedFields, 'field')} detected`]
          : []),
        ...(s.hasAcroForm ? ['Has form fields'] : []),
        ...(!s.hasTextLayer ? ['No text layer'] : []),
      ]
    : [];
  const suggestFill = !!s && (s.flatForm || s.hasAcroForm);
  const suggestOcr = !!s && !s.hasTextLayer;

  return (
    <Card aria-label={`Dropped file ${file.name}`} padding="lg">
      <Stack gap="5">
        <Inline gap="4" align="center" justify="between">
          <Inline gap="4" align="center" minSize="0">
            <IconTile icon={fileText} tone="neutral" />
            <Text weight="medium" truncate>
              {file.name}
            </Text>
          </Inline>
          <IconButton
            label="Dismiss"
            icon={close}
            size="sm"
            variant="ghost"
            tone="neutral"
            onClick={onDismiss}
          />
        </Inline>
        {probe.kind === 'locked' ? (
          <PasswordForm
            fileName={file.name}
            error={probe.error}
            busy={probe.busy}
            onSubmit={(p) => void unlock(p)}
            description="Enter its password to look inside. It is decrypted in your browser and never uploaded."
          />
        ) : null}
        {probe.kind === 'checking' || probe.kind === 'probing' ? (
          <Inline gap="3" align="center" role="status">
            <LoadingDots size="sm" tone="muted" />
            <Text size="sm" tone="muted">
              Looking at the document
            </Text>
          </Inline>
        ) : null}
        {probe.kind === 'failed' ? (
          <Text size="sm" tone="muted">
            Could not inspect this file
          </Text>
        ) : null}
        {meta.length ? (
          <Inline gap="2" wrap>
            {meta.map((m) => (
              <Badge key={m} size="sm" tone="neutral">
                {m}
              </Badge>
            ))}
          </Inline>
        ) : null}
        <Inline gap="2" wrap>
          {suggestFill ? (
            <Button
              variant="solid"
              tone="accent"
              icon={signatureDraw}
              iconEnd={arrowRight}
              onClick={() => open('fill-sign')}
            >
              Fill & Sign
            </Button>
          ) : null}
          {suggestOcr ? (
            <Button variant="soft" icon={ocrScan} onClick={() => open('ocr')}>
              Run OCR
            </Button>
          ) : null}
          <Button
            variant={suggestFill ? 'soft' : 'solid'}
            tone={suggestFill ? 'neutral' : 'accent'}
            onClick={() => open()}
          >
            Open in editor
          </Button>
        </Inline>
      </Stack>
    </Card>
  );
}
