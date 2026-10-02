import { useEffect, useState } from 'react';
import {
  IconArrowRight,
  IconFileText,
  IconModeFillSign,
  IconX,
} from '@/shared/ui/icons';
import {
  Button,
  Card,
  CardBody,
  IconButton,
  MetaList,
  Spinner,
  Text,
} from '@/shared/ui';
import { toToolError } from '@/shared/lib/errors';
import { PasswordPrompt } from '@/pdf/components';
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

  return (
    <Card aria-label={`Dropped file ${file.name}`}>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <IconFileText size="lg" className="text-fg-muted" />
            <Text weight="medium" className="truncate">
              {file.name}
            </Text>
          </div>
          <IconButton
            label="Dismiss"
            icon={IconX}
            size="sm"
            variant="ghost"
            onClick={onDismiss}
          />
        </div>
        {probe.kind === 'locked' ? (
          <PasswordPrompt
            fileName={file.name}
            error={probe.error}
            busy={probe.busy}
            onSubmit={(p) => void unlock(p)}
            description="Enter its password to look inside. It is decrypted in your browser and never uploaded."
          />
        ) : null}
        {probe.kind === 'checking' || probe.kind === 'probing' ? (
          <Text size="sm" tone="muted" className="flex items-center gap-2">
            <Spinner size="sm" />
            Looking at the document
          </Text>
        ) : null}
        {probe.kind === 'failed' ? (
          <Text size="sm" tone="muted">
            Could not inspect this file
          </Text>
        ) : null}
        {meta.length ? <MetaList items={meta} /> : null}
        <div className="flex flex-wrap gap-2">
          {suggestFill ? (
            <Button
              variant="primary"
              leftIcon={<IconModeFillSign size="sm" />}
              rightIcon={<IconArrowRight size="sm" />}
              onClick={() => open('fill-sign')}
            >
              Fill & Sign
            </Button>
          ) : null}
          <Button
            variant={suggestFill ? 'secondary' : 'primary'}
            onClick={() => open()}
          >
            Open in editor
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
