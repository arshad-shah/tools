import React, { useCallback, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  File,
  FileText,
  Grid3x3,
  Package,
  Plus,
  RefreshCw,
  Scissors,
  Trash2,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  FileUpload,
  Grid,
  IconButton,
  Inline,
  Input,
  Label,
  NumberInput,
  Spinner,
  Stack,
  Text,
} from '@/components/ui';
import { ToolProps } from '../../types/ToolTypes';
import {
  PdfSplitterState,
  SplitMode,
  SplitResult,
} from '../../types/PdfSplitterTypes';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SPLIT_MODE_OPTIONS: Array<{
  value: SplitMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'range',
    label: 'Page ranges',
    description: 'Custom ranges',
    icon: <Scissors size={20} aria-hidden />,
  },
  {
    value: 'individual',
    label: 'Individual pages',
    description: 'One per page',
    icon: <File size={20} aria-hidden />,
  },
  {
    value: 'every-n',
    label: 'Every N pages',
    description: 'Split equally',
    icon: <Package size={20} aria-hidden />,
  },
  {
    value: 'selection',
    label: 'Select pages',
    description: 'Choose visually',
    icon: <Check size={20} aria-hidden />,
  },
];

const PdfSplitter: React.FC<ToolProps> = () => {
  const [state, setState] = useState<PdfSplitterState>({
    pdfFile: null,
    pdfDoc: null,
    pageCount: 0,
    splitMode: 'selection',
    ranges: [{ id: '1', start: '', end: '' }],
    everyN: 2,
    processingState: 'idle',
    splitResults: [],
    error: null,
    pagePreviewUrls: [],
    currentPreviewPage: 0,
    previewLoading: false,
    selectedPages: new Set(),
    previewMode: 'grid',
  });

  const generatePagePreviews = useCallback(async (pdfDoc: PDFDocument) => {
    setState((prev) => ({ ...prev, previewLoading: true }));
    try {
      const urls: string[] = [];
      const count = Math.min(pdfDoc.getPageCount(), 50);
      for (let i = 0; i < count; i++) {
        try {
          const single = await PDFDocument.create();
          const [page] = await single.copyPages(pdfDoc, [i]);
          single.addPage(page);
          const bytes = await single.save();
          const blob = new Blob([new Uint8Array(bytes)], {
            type: 'application/pdf',
          });
          urls.push(URL.createObjectURL(blob));
        } catch (err) {
          console.error(`Failed to generate preview for page ${i + 1}:`, err);
          urls.push('');
        }
      }
      setState((prev) => ({
        ...prev,
        pagePreviewUrls: urls,
        previewLoading: false,
      }));
    } catch (err) {
      console.error('Failed to generate previews:', err);
      setState((prev) => ({
        ...prev,
        pagePreviewUrls: [],
        previewLoading: false,
      }));
    }
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file || file.type !== 'application/pdf') {
        setState((prev) => ({
          ...prev,
          error: { message: 'Please select a valid PDF file' },
        }));
        return;
      }
      try {
        setState((prev) => ({ ...prev, error: null, previewLoading: true }));
        const buf = await file.arrayBuffer();
        const pdf = await PDFDocument.load(buf);
        const pages = pdf.getPageCount();
        setState((prev) => ({
          ...prev,
          pdfFile: file,
          pdfDoc: pdf,
          pageCount: pages,
          splitResults: [],
          ranges: [{ id: '1', start: '', end: '' }],
          currentPreviewPage: 0,
        }));
        await generatePagePreviews(pdf);
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setState((prev) => ({
          ...prev,
          error: {
            message: "Failed to load PDF. Please ensure it's a valid PDF file.",
          },
          previewLoading: false,
        }));
      }
    },
    [generatePagePreviews],
  );

  const togglePageSelection = (i: number) => {
    setState((prev) => {
      const next = new Set(prev.selectedPages);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return { ...prev, selectedPages: next };
    });
  };

  const goToPage = (i: number) =>
    setState((prev) => ({
      ...prev,
      currentPreviewPage: Math.max(0, Math.min(prev.pageCount - 1, i)),
    }));

  const addRange = () => {
    setState((prev) => ({
      ...prev,
      ranges: [
        ...prev.ranges,
        { id: Date.now().toString(), start: '', end: '' },
      ],
    }));
  };

  const updateRange = (id: string, field: 'start' | 'end', value: string) => {
    setState((prev) => ({
      ...prev,
      ranges: prev.ranges.map((r) =>
        r.id === id ? { ...r, [field]: value } : r,
      ),
    }));
  };

  const removeRange = (id: string) => {
    setState((prev) =>
      prev.ranges.length > 1
        ? { ...prev, ranges: prev.ranges.filter((r) => r.id !== id) }
        : prev,
    );
  };

  const changeSplitMode = (mode: SplitMode) =>
    setState((prev) => ({
      ...prev,
      splitMode: mode,
      splitResults: [],
      error: null,
    }));

  const splitPDF = async () => {
    if (!state.pdfDoc) return;
    setState((prev) => ({
      ...prev,
      processingState: 'processing',
      error: null,
      splitResults: [],
    }));
    try {
      const results: SplitResult[] = [];
      if (state.splitMode === 'individual') {
        for (let i = 0; i < state.pageCount; i++) {
          const doc = await PDFDocument.create();
          const [p] = await doc.copyPages(state.pdfDoc, [i]);
          doc.addPage(p);
          const bytes = await doc.save();
          const blob = new Blob([new Uint8Array(bytes)], {
            type: 'application/pdf',
          });
          results.push({
            name: `page_${i + 1}.pdf`,
            url: URL.createObjectURL(blob),
            pages: `Page ${i + 1}`,
            size: bytes.length,
          });
        }
      } else if (state.splitMode === 'every-n') {
        const n = Number(state.everyN);
        if (Number.isNaN(n) || n < 1) {
          setState((prev) => ({
            ...prev,
            processingState: 'error',
            error: { message: 'Please enter a valid number of pages' },
          }));
          return;
        }
        for (let i = 0; i < state.pageCount; i += n) {
          const end = Math.min(i + n, state.pageCount);
          const doc = await PDFDocument.create();
          const indices = Array.from({ length: end - i }, (_, idx) => i + idx);
          const pages = await doc.copyPages(state.pdfDoc, indices);
          pages.forEach((p) => doc.addPage(p));
          const bytes = await doc.save();
          const blob = new Blob([new Uint8Array(bytes)], {
            type: 'application/pdf',
          });
          results.push({
            name: `pages_${i + 1}-${end}.pdf`,
            url: URL.createObjectURL(blob),
            pages: `Pages ${i + 1}-${end}`,
            size: bytes.length,
          });
        }
      } else if (state.splitMode === 'selection') {
        if (state.selectedPages.size === 0) {
          setState((prev) => ({
            ...prev,
            processingState: 'error',
            error: { message: 'Please select at least one page to extract' },
          }));
          return;
        }
        const sorted = Array.from(state.selectedPages).sort((a, b) => a - b);
        const doc = await PDFDocument.create();
        const pages = await doc.copyPages(state.pdfDoc, sorted);
        pages.forEach((p) => doc.addPage(p));
        const bytes = await doc.save();
        const blob = new Blob([new Uint8Array(bytes)], {
          type: 'application/pdf',
        });
        const list = sorted.map((i) => i + 1).join(', ');
        results.push({
          name: `selected_pages.pdf`,
          url: URL.createObjectURL(blob),
          pages: `Pages: ${list}`,
          size: bytes.length,
        });
      } else {
        for (let i = 0; i < state.ranges.length; i++) {
          const { start, end } = state.ranges[i];
          const s = parseInt(start);
          const e = parseInt(end);
          if (Number.isNaN(s) || Number.isNaN(e)) {
            setState((prev) => ({
              ...prev,
              processingState: 'error',
              error: {
                message: `Invalid page range in split ${i + 1}`,
                rangeIndex: i,
              },
            }));
            return;
          }
          if (s < 1 || e > state.pageCount || s > e) {
            setState((prev) => ({
              ...prev,
              processingState: 'error',
              error: {
                message: `Invalid page range ${s}-${e}. Pages must be between 1 and ${state.pageCount}`,
                rangeIndex: i,
              },
            }));
            return;
          }
          const doc = await PDFDocument.create();
          const indices = Array.from(
            { length: e - s + 1 },
            (_, idx) => s - 1 + idx,
          );
          const pages = await doc.copyPages(state.pdfDoc, indices);
          pages.forEach((p) => doc.addPage(p));
          const bytes = await doc.save();
          const blob = new Blob([new Uint8Array(bytes)], {
            type: 'application/pdf',
          });
          results.push({
            name: `pages_${s}-${e}.pdf`,
            url: URL.createObjectURL(blob),
            pages: `Pages ${s}-${e}`,
            size: bytes.length,
          });
        }
      }
      setState((prev) => ({
        ...prev,
        processingState: 'completed',
        splitResults: results,
      }));
    } catch (err) {
      console.error('Split failed:', err);
      setState((prev) => ({
        ...prev,
        processingState: 'error',
        error: {
          message: 'An unexpected error occurred while splitting the PDF.',
        },
      }));
    }
  };

  const downloadFile = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    state.splitResults.forEach((r, i) => {
      setTimeout(() => downloadFile(r.url, r.name), i * 100);
    });
  };

  const reset = () => {
    setState({
      pdfFile: null,
      pdfDoc: null,
      pageCount: 0,
      splitMode: 'selection',
      ranges: [{ id: '1', start: '', end: '' }],
      everyN: 2,
      processingState: 'idle',
      splitResults: [],
      error: null,
      pagePreviewUrls: [],
      currentPreviewPage: 0,
      previewLoading: false,
      selectedPages: new Set(),
      previewMode: 'grid',
    });
  };

  const isProcessing = state.processingState === 'processing';

  const renderPreview = () => {
    if (!state.pdfFile || state.pageCount === 0) return null;
    if (state.previewLoading) {
      return (
        <Center className="py-10">
          <Stack gap="3" align="center">
            <Spinner size="lg" />
            <Text size="sm" tone="subtle">
              Generating preview…
            </Text>
          </Stack>
        </Center>
      );
    }

    const handleClick = (i: number) => {
      if (state.splitMode === 'selection') togglePageSelection(i);
      else {
        goToPage(i);
        setState((prev) => ({ ...prev, previewMode: 'single' }));
      }
    };

    if (state.previewMode === 'grid') {
      return (
        <Grid max={4} gap="3">
          {Array.from({ length: state.pageCount }).map((_, i) => {
            const url = state.pagePreviewUrls[i];
            const selected = state.selectedPages.has(i);
            const inSelMode = state.splitMode === 'selection';
            return (
              <Card
                key={i}
                interactive
                className={selected && inSelMode ? 'border-accent' : undefined}
                onClick={() => handleClick(i)}
              >
                <CardBody>
                  <Stack gap="2">
                    {inSelMode && (
                      <Inline justify="end">
                        {selected ? (
                          <Badge variant="solid" tone="accent" size="xs">
                            <Check size={12} aria-hidden />
                          </Badge>
                        ) : (
                          <Badge variant="outline" tone="neutral" size="xs">
                            ?
                          </Badge>
                        )}
                      </Inline>
                    )}
                    <div className="relative aspect-[3/4] w-full">
                      {url ? (
                        <iframe
                          src={url}
                          className="absolute inset-0 h-full w-full"
                          frameBorder={0}
                          title={`Page ${i + 1} preview`}
                        />
                      ) : (
                        <Center className="absolute inset-0">
                          <Stack gap="1" align="center">
                            <FileText size={24} aria-hidden />
                            <Text size="xs" tone="subtle">
                              Page {i + 1}
                            </Text>
                          </Stack>
                        </Center>
                      )}
                    </div>
                    <Badge variant="soft" tone="neutral" size="xs">
                      Page {i + 1}
                    </Badge>
                  </Stack>
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      );
    }

    const url = state.pagePreviewUrls[state.currentPreviewPage];
    return (
      <Stack gap="4">
        <Center>
          <Text size="sm" tone="subtle">
            Page {state.currentPreviewPage + 1} of {state.pageCount}
          </Text>
        </Center>
        <Card>
          <CardBody>
            {url ? (
              <div className="relative aspect-[3/4] w-full">
                <iframe
                  src={url}
                  className="absolute inset-0 h-full w-full"
                  frameBorder={0}
                  scrolling="no"
                  title={`Page ${state.currentPreviewPage + 1} preview`}
                />
              </div>
            ) : (
              <Center className="py-10">
                <Stack gap="2" align="center">
                  <FileText size={48} aria-hidden />
                  <Text size="sm" tone="subtle">
                    Preview not available for page{' '}
                    {state.currentPreviewPage + 1}
                  </Text>
                </Stack>
              </Center>
            )}
          </CardBody>
        </Card>
        {state.pageCount > 1 && (
          <Inline justify="between" align="center" gap="2" wrap>
            <Button
              variant="soft"
              size="sm"
              leftIcon={<ChevronLeft size={16} />}
              disabled={state.currentPreviewPage === 0}
              onClick={() => goToPage(state.currentPreviewPage - 1)}
            >
              Previous
            </Button>
            <Inline gap="1" wrap>
              {Array.from({
                length: Math.min(state.pageCount, 10),
              }).map((_, i) => (
                <Button
                  key={i}
                  variant={state.currentPreviewPage === i ? 'solid' : 'soft'}
                  size="sm"
                  className="w-8 px-0"
                  onClick={() => goToPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              {state.pageCount > 10 && (
                <Text size="sm" tone="subtle">
                  …
                </Text>
              )}
            </Inline>
            <Button
              variant="soft"
              size="sm"
              rightIcon={<ChevronRight size={16} />}
              disabled={state.currentPreviewPage === state.pageCount - 1}
              onClick={() => goToPage(state.currentPreviewPage + 1)}
            >
              Next
            </Button>
          </Inline>
        )}
      </Stack>
    );
  };

  return (
    <Stack gap="6">
      <Card>
        <CardBody>
          <Stack gap="6">
            {state.error && (
              <Alert status="danger">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.error.message}</AlertDescription>
              </Alert>
            )}

            {!state.pdfFile && (
              <FileUpload
                accept="application/pdf,.pdf"
                onFiles={(files: File[]) =>
                  files[0] && handleFileSelect(files[0])
                }
              />
            )}

            {state.pdfFile && state.splitResults.length === 0 && (
              <Stack gap="6">
                <Card>
                  <CardBody>
                    <Inline justify="between" align="center" gap="3" wrap>
                      <Inline align="center" gap="3">
                        <FileText size={32} aria-hidden />
                        <Stack gap="1">
                          <Text size="md" weight="semibold">
                            {state.pdfFile.name}
                          </Text>
                          <Text size="sm" tone="subtle">
                            {state.pageCount} pages •{' '}
                            {formatFileSize(state.pdfFile.size)}
                          </Text>
                        </Stack>
                      </Inline>
                      <Button
                        variant="soft"
                        size="sm"
                        leftIcon={<RefreshCw size={16} />}
                        onClick={reset}
                      >
                        Change file
                      </Button>
                    </Inline>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Inline justify="between" align="center" gap="3" wrap>
                      <Inline align="center" gap="2">
                        <Eye size={20} aria-hidden />
                        <CardTitle as="h3">PDF preview</CardTitle>
                      </Inline>
                      <Inline gap="2" wrap>
                        {state.splitMode === 'selection' && (
                          <Inline gap="2" wrap align="center">
                            <Button
                              variant="soft"
                              size="sm"
                              onClick={() => {
                                const all = new Set(
                                  Array.from(
                                    { length: state.pageCount },
                                    (_, i) => i,
                                  ),
                                );
                                setState((prev) => ({
                                  ...prev,
                                  selectedPages: all,
                                }));
                              }}
                            >
                              Select all
                            </Button>
                            <Button
                              variant="soft"
                              size="sm"
                              onClick={() =>
                                setState((prev) => ({
                                  ...prev,
                                  selectedPages: new Set(),
                                }))
                              }
                            >
                              Clear all
                            </Button>
                            <Badge variant="soft" tone="accent" size="sm">
                              {state.selectedPages.size} selected
                            </Badge>
                          </Inline>
                        )}
                        <Button
                          variant="soft"
                          size="sm"
                          leftIcon={
                            state.previewMode === 'single' ? (
                              <Grid3x3 size={16} />
                            ) : (
                              <Eye size={16} />
                            )
                          }
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              previewMode:
                                prev.previewMode === 'single'
                                  ? 'grid'
                                  : 'single',
                            }))
                          }
                        >
                          {state.previewMode === 'single' ? 'Grid' : 'Single'}
                        </Button>
                      </Inline>
                    </Inline>
                  </CardHeader>
                  <CardBody>{renderPreview()}</CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle as="h3">Split method</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Stack gap="4">
                      <Grid max={4} gap="3">
                        {SPLIT_MODE_OPTIONS.map((m) => (
                          <Card
                            key={m.value}
                            interactive
                            className={
                              state.splitMode === m.value
                                ? 'border-accent'
                                : undefined
                            }
                            onClick={() => changeSplitMode(m.value)}
                          >
                            <CardBody>
                              <Stack gap="2" align="center">
                                {m.icon}
                                <Text
                                  size="sm"
                                  weight="semibold"
                                  className="text-center"
                                >
                                  {m.label}
                                </Text>
                                <Text
                                  size="xs"
                                  tone="subtle"
                                  className="text-center"
                                >
                                  {m.description}
                                </Text>
                              </Stack>
                            </CardBody>
                          </Card>
                        ))}
                      </Grid>

                      {state.splitMode === 'range' && (
                        <Stack gap="3">
                          {state.ranges.map((r, i) => (
                            <Card key={r.id}>
                              <CardBody>
                                <Inline gap="2" align="end" wrap>
                                  <Badge variant="soft" tone="accent" size="sm">
                                    #{i + 1}
                                  </Badge>
                                  <Stack gap="1" className="flex-1">
                                    <Label htmlFor={`range-start-${r.id}`}>
                                      From
                                    </Label>
                                    <Input
                                      id={`range-start-${r.id}`}
                                      type="number"
                                      value={r.start}
                                      onChange={(v) =>
                                        updateRange(r.id, 'start', v)
                                      }
                                      placeholder="1"
                                      aria-label={`Range ${i + 1} start`}
                                    />
                                  </Stack>
                                  <Stack gap="1" className="flex-1">
                                    <Label htmlFor={`range-end-${r.id}`}>
                                      To
                                    </Label>
                                    <Input
                                      id={`range-end-${r.id}`}
                                      type="number"
                                      value={r.end}
                                      onChange={(v) =>
                                        updateRange(r.id, 'end', v)
                                      }
                                      placeholder={`${state.pageCount}`}
                                      aria-label={`Range ${i + 1} end`}
                                    />
                                  </Stack>
                                  {state.ranges.length > 1 && (
                                    <IconButton
                                      variant="danger"
                                      size="sm"
                                      label="Remove range"
                                      icon={<Trash2 size={14} />}
                                      onClick={() => removeRange(r.id)}
                                    />
                                  )}
                                </Inline>
                              </CardBody>
                            </Card>
                          ))}
                          <Button
                            variant="soft"
                            className="w-full"
                            leftIcon={<Plus size={16} />}
                            onClick={addRange}
                          >
                            Add range
                          </Button>
                        </Stack>
                      )}

                      {state.splitMode === 'every-n' && (
                        <Stack gap="2">
                          <Label>Split every</Label>
                          <Inline gap="2" align="center" wrap>
                            <Box className="min-w-0 flex-1">
                              <NumberInput
                                value={state.everyN}
                                onValueChange={(v) =>
                                  setState((prev) => ({
                                    ...prev,
                                    everyN: v || 1,
                                  }))
                                }
                                min={1}
                                max={state.pageCount}
                                aria-label="Pages per file"
                              />
                            </Box>
                            <Text size="sm">pages</Text>
                          </Inline>
                          <Text size="sm" tone="subtle">
                            This will create{' '}
                            {Math.ceil(state.pageCount / state.everyN)} PDF
                            files.
                          </Text>
                        </Stack>
                      )}

                      {state.splitMode === 'selection' && (
                        <Alert status="info" icon={<Check aria-hidden />}>
                          <AlertTitle>Visual page selection</AlertTitle>
                          <AlertDescription>
                            Use the preview above to select pages. Click pages
                            in grid view to toggle selection. Use Select all /
                            Clear all for quick actions.
                          </AlertDescription>
                        </Alert>
                      )}

                      {state.splitMode === 'individual' && (
                        <Alert status="info">
                          <AlertDescription>
                            This will create{' '}
                            <Text as="span" weight="semibold">
                              {state.pageCount}
                            </Text>{' '}
                            separate PDF files, one per page.
                          </AlertDescription>
                        </Alert>
                      )}
                    </Stack>
                  </CardBody>
                </Card>

                <Button
                  onClick={splitPDF}
                  variant="solid"
                  size="lg"
                  className="w-full"
                  disabled={isProcessing}
                  leftIcon={
                    isProcessing ? (
                      <Spinner size="sm" />
                    ) : (
                      <Scissors size={20} />
                    )
                  }
                >
                  {isProcessing ? 'Splitting PDF…' : 'Split PDF'}
                </Button>
              </Stack>
            )}

            {state.splitResults.length > 0 && (
              <Stack gap="4">
                <Alert status="success">
                  <AlertTitle>
                    Successfully split into {state.splitResults.length} files
                  </AlertTitle>
                  <AlertDescription>
                    Download individual files or all at once.
                  </AlertDescription>
                </Alert>

                <Button
                  variant="solid"
                  size="lg"
                  className="w-full"
                  leftIcon={<Package size={20} />}
                  onClick={downloadAll}
                >
                  Download all files
                </Button>

                <Stack gap="2">
                  {state.splitResults.map((r, i) => (
                    <Card key={i}>
                      <CardBody>
                        <Inline justify="between" align="center" gap="3" wrap>
                          <Inline align="center" gap="3">
                            <FileText size={20} aria-hidden />
                            <Stack gap="1">
                              <Text size="sm" weight="medium">
                                {r.name}
                              </Text>
                              <Text size="xs" tone="subtle">
                                {r.pages} • {formatFileSize(r.size)}
                              </Text>
                            </Stack>
                          </Inline>
                          <Button
                            variant="soft"
                            size="sm"
                            leftIcon={<Download size={16} />}
                            onClick={() => downloadFile(r.url, r.name)}
                          >
                            Download
                          </Button>
                        </Inline>
                      </CardBody>
                    </Card>
                  ))}
                </Stack>

                <Button
                  variant="soft"
                  className="w-full"
                  leftIcon={<RefreshCw size={16} />}
                  onClick={reset}
                >
                  Split another PDF
                </Button>
              </Stack>
            )}
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
};

export default PdfSplitter;
