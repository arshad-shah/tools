import React, { useMemo, useState } from 'react';
import { Copy, FileText } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardBody,
  Label,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { LoadedFile } from '@/shared/lib/files';
import { deriveFilename } from '@/shared/lib/download';
import { useClipboard } from '@/shared/lib/clipboard';
import { notify } from '@/shared/lib/notify';
import { useJob } from '@/shared/state/useJob';
import {
  pdfRender,
  usePdfDocument,
  type DocInfo,
  type PageText,
} from '@/pdf/render';
import {
  JobPanel,
  PageThumb,
  PdfFileHeader,
  ResultFiles,
} from '@/pdf/components';
import {
  combinedText,
  pagesWithoutText,
  previewText,
  textOutputs,
  type TextMode,
} from './lib/output';
import { useTextSettings } from './store';

const PdfToTextTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const { mode, setMode } = useTextSettings();
  const { doc, loading, error } = usePdfDocument(file);
  const { copied, copy } = useClipboard();

  const job = useJob(async (ctx, info: DocInfo): Promise<PageText[]> => {
    const pages: PageText[] = [];
    for (let i = 0; i < info.pageCount; i++) {
      ctx.progress({ done: i, total: info.pageCount, label: 'Reading pages' });
      pages.push(await pdfRender.extractText(info.docId, i, ctx.signal));
    }
    return pages;
  });

  // Derived, so switching the output mode never re-extracts.
  const outputs = useMemo(
    () => (job.result && file ? textOutputs(file.name, job.result, mode) : []),
    [job.result, file, mode],
  );
  const fullText = useMemo(
    () => (job.result ? combinedText(job.result) : ''),
    [job.result],
  );
  const preview = useMemo(() => previewText(fullText), [fullText]);
  const missing = job.result ? pagesWithoutText(job.result) : [];

  const pick = (picked: LoadedFile) => {
    job.reset();
    setFile(picked);
  };
  const clearFile = () => {
    job.reset();
    setFile(null);
  };
  const copyAll = async () => {
    // useClipboard reports failures itself.
    if (await copy(fullText)) notify.success('Copied');
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfFileHeader
            file={file}
            onFile={pick}
            onClear={clearFile}
            loading={loading}
            error={error}
          />
          {file && doc && (
            <>
              <div className="flex items-center gap-3">
                <PageThumb
                  docId={doc.docId}
                  pageIndex={0}
                  page={doc.pages[0]}
                  width={56}
                  label="Page 1"
                />
                <Text size="sm" tone="muted">
                  {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                </Text>
              </div>
              <Stack gap="2">
                <Label>Output</Label>
                <Tabs
                  value={mode}
                  onValueChange={(v) => setMode(v as TextMode)}
                  variant="soft"
                >
                  <TabsList aria-label="Output">
                    <TabsTrigger value="combined">One file</TabsTrigger>
                    <TabsTrigger value="per-page">
                      One file per page
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </Stack>
              <div>
                <Button
                  variant="solid"
                  leftIcon={<FileText size={16} />}
                  disabled={job.status === 'running'}
                  onClick={() => job.run(doc)}
                >
                  Extract text
                </Button>
              </div>
            </>
          )}
          <JobPanel
            job={job}
            onCancel={job.cancel}
            runningLabel="Reading pages"
          >
            {job.result && file && (
              <Stack gap="4">
                {missing.length > 0 && (
                  <Alert status="warning">
                    <AlertTitle>Some pages have no text</AlertTitle>
                    <AlertDescription>
                      No text layer on page(s) {missing.join(', ')}. They are
                      probably scanned images; OCR is not supported.
                    </AlertDescription>
                  </Alert>
                )}
                <Stack gap="2">
                  <Label htmlFor="text-preview">Extracted text</Label>
                  <Textarea
                    id="text-preview"
                    readOnly
                    rows={12}
                    value={preview.text}
                  />
                  {preview.truncated && (
                    <Text size="sm" tone="muted">
                      Preview truncated; the download has everything.
                    </Text>
                  )}
                </Stack>
                <div>
                  <Button
                    variant="soft"
                    leftIcon={<Copy size={16} />}
                    onClick={() => void copyAll()}
                  >
                    {copied ? 'Copied' : 'Copy text'}
                  </Button>
                </div>
                <ResultFiles
                  files={outputs}
                  zipName={deriveFilename(file.name, 'text', 'zip')}
                />
              </Stack>
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfToTextTool;
