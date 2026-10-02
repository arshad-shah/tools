import React, { useRef, useState } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconSignature,
} from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardBody,
  IconButton,
  Inline,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import { deriveFilename } from '@/shared/lib/download';
import { useObjectUrl } from '@/shared/lib/object-url';
import { toToolError } from '@/shared/lib/errors';
import { useJob } from '@/shared/state/useJob';
import {
  layoutInk,
  stamp,
  type InkLayout,
  type StampContent,
  type VisualRect,
} from '@/pdf/edit';
import { usePdfDocument, type PageInfo } from '@/pdf/render';
import {
  JobPanel,
  PdfFileHeader,
  ResultFiles,
  type ResultFile,
  type PdfInputFile,
  UNENCRYPTED_NOTE,
} from '@/pdf/components';
import { PlacementEditor } from './components/PlacementEditor';
import { SignatureDraw } from './components/SignatureDraw';
import { SignatureType } from './components/SignatureType';
import { SignatureUpload } from './components/SignatureUpload';
import { TypedSignaturePreview } from './components/TypedSignaturePreview';
import { fetchFontBytes, inkAspect, loadSignatureFont } from './lib/fonts';
import { clampRect, defaultRect, rectToPixels } from './lib/placement';
import type { SignatureSource } from './lib/signature';

type SourceTab = 'draw' | 'upload' | 'type';

const EDITOR_WIDTH = 480;

/** Keeps a placed box where it is (same height) when only the aspect changes. */
function fitRect(
  prev: VisualRect | null,
  page: PageInfo,
  aspect: number,
): VisualRect {
  if (!prev) return defaultRect(page, aspect);
  const width = prev.height * aspect;
  return clampRect(
    { ...prev, x: prev.x + (prev.width - width) / 2, width },
    page,
  );
}

const PdfSignTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<PdfInputFile | null>(null);
  const [source, setSource] = useState<SignatureSource | null>(null);
  const [tab, setTab] = useState<SourceTab>('draw');
  const [pageIndex, setPageIndex] = useState(0);
  const [rect, setRect] = useState<VisualRect | null>(null);
  const [aspect, setAspect] = useState(3);
  /** Glyph layout of a typed signature (same metrics as the stamped text). */
  const [typed, setTyped] = useState<InkLayout | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const sourceRun = useRef(0);
  const { doc, loading, error } = usePdfDocument(file);

  const imageUrl = useObjectUrl(
    source?.kind === 'image' ? source.bytes : null,
    source?.kind === 'image' && source.format === 'jpeg'
      ? 'image/jpeg'
      : 'image/png',
  );

  const job = useJob(
    async (
      _ctx,
      input: PdfInputFile,
      at: { pageIndex: number; rect: VisualRect },
      src: SignatureSource,
    ): Promise<ResultFile> => {
      const content: StampContent =
        src.kind === 'image'
          ? { kind: 'image', bytes: src.bytes, format: src.format }
          : {
              kind: 'text',
              text: src.text,
              fontBytes: await fetchFontBytes(src.fontId),
              color: src.color,
            };
      const bytes = await stamp(input.bytes, {
        pageIndex: at.pageIndex,
        rect: at.rect,
        content,
      });
      return {
        name: deriveFilename(input.name, 'signed', 'pdf'),
        bytes,
        detail: `Signed on page ${at.pageIndex + 1}`,
      };
    },
  );

  const changeSource = async (next: SignatureSource | null) => {
    const run = ++sourceRun.current;
    job.reset();
    setSourceError(null);
    if (!next || !doc) {
      setSource(next);
      setRect(null);
      return;
    }
    let ratio: number;
    let layout: InkLayout | null = null;
    if (next.kind === 'image') ratio = next.width / next.height;
    else {
      try {
        layout = layoutInk(await loadSignatureFont(next.fontId), next.text);
      } catch (e) {
        if (run !== sourceRun.current) return;
        setSourceError(toToolError(e).message);
        setSource(null);
        setRect(null);
        return;
      }
      if (run !== sourceRun.current) return;
      ratio = inkAspect(layout);
    }
    setTyped(layout);
    setSource(next);
    setAspect(ratio);
    setRect((prev) => fitRect(prev, doc.pages[pageIndex], ratio));
  };

  const changePage = (index: number) => {
    if (!doc) return;
    job.reset();
    setPageIndex(index);
    if (source) setRect(defaultRect(doc.pages[index], aspect));
  };

  const changeTab = (v: string) => {
    sourceRun.current++;
    job.reset();
    setTab(v as SourceTab);
    setSource(null);
    setRect(null);
  };

  const pick = (picked: PdfInputFile) => {
    job.reset();
    setFile(picked);
    setPageIndex(0);
    setSource(null);
    setRect(null);
  };
  const clearFile = () => {
    job.reset();
    setFile(null);
    setSource(null);
    setRect(null);
  };

  const page = doc?.pages[pageIndex];
  const preview =
    source?.kind === 'image' ? (
      <img
        src={imageUrl ?? undefined}
        alt=""
        draggable={false}
        className="pointer-events-none size-full object-contain"
      />
    ) : source?.kind === 'text' && typed && rect && page ? (
      <TypedSignaturePreview
        layout={typed}
        color={source.color}
        {...rectToPixels(rect, EDITOR_WIDTH / page.width)}
      />
    ) : null;

  const sourceProps = {
    onChange: (s: SignatureSource | null) => void changeSource(s),
    disabled: job.status === 'running',
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
              <Alert status="info">
                <AlertTitle>Visual signature</AlertTitle>
                <AlertDescription>
                  This places an image of your signature on the page. It is not
                  a digital (certificate-based) signature and does not prove who
                  signed.
                </AlertDescription>
              </Alert>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
                <Tabs value={tab} onValueChange={changeTab} variant="soft">
                  <TabsList aria-label="Signature source">
                    <TabsTrigger value="draw">Draw</TabsTrigger>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="type">Type</TabsTrigger>
                  </TabsList>
                  <TabsContent value="draw">
                    <SignatureDraw {...sourceProps} />
                  </TabsContent>
                  <TabsContent value="upload">
                    <SignatureUpload {...sourceProps} />
                  </TabsContent>
                  <TabsContent value="type">
                    <SignatureType {...sourceProps} />
                  </TabsContent>
                  {sourceError && (
                    <Alert status="danger">
                      <AlertDescription>{sourceError}</AlertDescription>
                    </Alert>
                  )}
                </Tabs>
                <Stack gap="3">
                  <Inline gap="2" align="center">
                    <IconButton
                      label="Previous page"
                      icon={<IconChevronLeft size="sm" />}
                      size="sm"
                      disabled={pageIndex === 0}
                      onClick={() => changePage(pageIndex - 1)}
                    />
                    <Text size="sm">
                      Page {pageIndex + 1} of {doc.pageCount}
                    </Text>
                    <IconButton
                      label="Next page"
                      icon={<IconChevronRight size="sm" />}
                      size="sm"
                      disabled={pageIndex >= doc.pageCount - 1}
                      onClick={() => changePage(pageIndex + 1)}
                    />
                  </Inline>
                  <div className="max-w-full overflow-x-auto">
                    <PlacementEditor
                      doc={doc}
                      pageIndex={pageIndex}
                      rect={source ? rect : null}
                      onRectChange={(r) => {
                        job.reset();
                        setRect(r);
                      }}
                      preview={preview}
                      width={EDITOR_WIDTH}
                      disabled={job.status === 'running'}
                    />
                  </div>
                  {!source && (
                    <Text size="sm" tone="muted">
                      Create a signature, then drag it into place (or focus it
                      and use the arrow keys).
                    </Text>
                  )}
                </Stack>
              </div>
              <Button
                variant="solid"
                leftIcon={<IconSignature size="sm" />}
                disabled={job.status === 'running' || !source || !rect}
                onClick={() =>
                  source && rect && job.run(file, { pageIndex, rect }, source)
                }
              >
                Apply signature
              </Button>
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Signing">
            {job.result && (
              <ResultFiles
                note={file?.wasEncrypted ? UNENCRYPTED_NOTE : undefined}
                files={[job.result]}
              />
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfSignTool;
