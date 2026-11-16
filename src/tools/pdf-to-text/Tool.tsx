import {
  Button,
  Card,
  CopyButton,
  Grid,
  GridItem,
  Notice,
  SegmentedControl,
  Stack,
  Text,
  TextArea,
} from '@arshad-shah/cynosure';
import { fileText } from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import type { PdfInputFile } from '@/pdf/intake/use-pdf-intake';
import {
  pdfRender,
  usePdfDocument,
  type DocInfo,
  type PageText,
} from '@/pdf/render';
import { ChosenFile } from '@/pdf/ui/ChosenFile';
import { PageGrid } from '@/pdf/ui/PageGrid';
import { PdfIntake } from '@/pdf/ui/PdfIntake';
import { JobProgress, ResultCard } from '@/pdf/ui/ResultCard';
import { deriveFilename } from '@/shared/lib/download';
import { useHandoff } from '@/shared/lib/handoff';
import { useJob } from '@/shared/state/useJob';
import {
  combinedText,
  pagesWithoutText,
  previewText,
  textOutputs,
  type TextMode,
} from './lib/output';
import { useTextSettings } from './store';

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * PDF to Text (redesign spec, file tool pattern): drop a PDF, choose one
 * file or one per page, extract, then read, copy or download the text.
 */
export default function PdfToTextTool() {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const { mode, setMode } = useTextSettings();
  const { doc, loading, error } = usePdfDocument(file);

  const job = useJob(async (ctx, info: DocInfo): Promise<PageText[]> => {
    const pages: PageText[] = [];
    for (let i = 0; i < info.pageCount; i++) {
      ctx.progress({ done: i, total: info.pageCount, label: 'Reading pages' });
      pages.push(await pdfRender.extractText(info.docId, i, ctx.signal));
    }
    return pages;
  });

  // Derived, so switching the output mode never re-extracts.
  const result = job.status === 'done' ? job.result : null;
  const outputs = useMemo(
    () => (result && file ? textOutputs(file.name, result, mode) : []),
    [result, file, mode],
  );
  const fullText = useMemo(
    () => (result ? combinedText(result) : ''),
    [result],
  );
  const preview = useMemo(() => previewText(fullText), [fullText]);
  const missing = result ? pagesWithoutText(result) : [];
  const busy = job.status === 'running';

  return (
    <Stack gap="6">
      {file ? (
        <ChosenFile
          name={file.name}
          size={file.size}
          detail={
            doc
              ? plural(doc.pageCount, 'page')
              : loading
                ? 'Opening'
                : undefined
          }
          disabled={busy}
          onClear={() => {
            job.reset();
            setFile(null);
          }}
        />
      ) : (
        <PdfIntake
          initialFiles={handed}
          onFiles={(files) => {
            job.reset();
            setFile(files[0]);
          }}
        />
      )}
      {error ? <Notice tone="danger">{error.message}</Notice> : null}

      {file && doc ? (
        <Grid columns={{ base: 1, lg: 3 }} gap="6" align="start">
          <GridItem span={{ base: 1, lg: 2 }} order={{ base: 2, lg: 1 }}>
            <Card as="section" title="Pages">
              <PageGrid doc={doc} />
            </Card>
          </GridItem>
          <GridItem order={{ base: 1, lg: 2 }}>
            <Card as="section" title="Text">
              <Stack gap="5">
                <SegmentedControl
                  label="Output"
                  value={mode}
                  onChange={(v) => setMode(v as TextMode)}
                  options={[
                    { value: 'combined', label: 'One file' },
                    { value: 'per-page', label: 'One file per page' },
                  ]}
                />
                <JobProgress
                  job={job}
                  label="Reading pages"
                  onCancel={job.cancel}
                />
                {busy ? null : (
                  <Button
                    variant="solid"
                    tone="accent"
                    size="lg"
                    fullWidth
                    icon={fileText}
                    onClick={() => void job.run(doc)}
                  >
                    Extract text
                  </Button>
                )}
              </Stack>
            </Card>
          </GridItem>
        </Grid>
      ) : null}

      {result && file ? (
        <Stack gap="6">
          {missing.length ? (
            <Notice tone="warning" title="Some pages have no text">
              No text layer on page(s) {missing.join(', ')}. They are probably
              scanned images: open the PDF in the workspace and run OCR.
            </Notice>
          ) : null}
          <Card
            as="section"
            title="Extracted text"
            actions={
              <CopyButton
                value={fullText}
                labels={{ copy: 'Copy text', copied: 'Copied' }}
              />
            }
          >
            <Stack gap="3">
              <TextArea
                label="Extracted text"
                labelHidden
                readOnly
                rows={12}
                value={preview.text}
              />
              {preview.truncated ? (
                <Text size="sm" tone="muted">
                  The preview is cut short; the download has everything.
                </Text>
              ) : null}
            </Stack>
          </Card>
          <ResultCard
            files={outputs}
            note={
              file.wasEncrypted
                ? 'The original was password-protected. The text is not'
                : undefined
            }
            zipName={deriveFilename(file.name, 'text', 'zip')}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
