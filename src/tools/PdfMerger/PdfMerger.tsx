import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardBody,
  FileUpload,
  Grid,
  Heading,
  IconButton,
  Inline,
  Spinner,
  Stack,
  Text,
} from '@arshad-shah/cynosure-react';
import { ToolProps } from '../../types/ToolTypes';
import {
  PDFFile,
  MergedPDFResult,
  PDFMergerState,
} from '../../types/PdfMergerTypes';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const PdfMerger: React.FC<ToolProps> = () => {
  const [state, setState] = useState<PDFMergerState>({
    files: [],
    processingState: 'idle',
    mergedPDF: null,
    error: null,
  });

  const handleFilesChange = (files: File[]) => {
    const pdfFiles: PDFFile[] = files
      .filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${file.name}`,
        file,
        name: file.name,
        size: file.size,
      }));
    setState((prev) => ({
      ...prev,
      files: pdfFiles,
      mergedPDF: null,
      error: null,
    }));
  };

  const removeFile = (id: string) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== id),
      mergedPDF: null,
      error: null,
    }));
  };

  const moveFile = (index: number, dir: -1 | 1) => {
    const next = [...state.files];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setState((prev) => ({ ...prev, files: next }));
  };

  const mergePDFs = async () => {
    if (state.files.length < 2) {
      setState((prev) => ({
        ...prev,
        error: { message: 'Please add at least 2 PDF files to merge.' },
      }));
      return;
    }
    setState((prev) => ({ ...prev, processingState: 'processing', error: null }));
    try {
      const mergedDoc = await PDFDocument.create();
      for (const item of state.files) {
        try {
          const bytes = await item.file.arrayBuffer();
          const doc = await PDFDocument.load(bytes);
          const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
          pages.forEach((p) => mergedDoc.addPage(p));
        } catch (err) {
          console.error(`Error processing file ${item.name}`, err);
          setState((prev) => ({
            ...prev,
            processingState: 'error',
            error: {
              message: `Failed to process "${item.name}". Please ensure it's a valid PDF file.`,
              fileId: item.id,
              fileName: item.name,
            },
          }));
          return;
        }
      }
      const mergedBytes = await mergedDoc.save();
      const blob = new Blob([new Uint8Array(mergedBytes)], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const merged: MergedPDFResult = {
        url,
        size: mergedBytes.length,
        pageCount: mergedDoc.getPageCount(),
      };
      setState((prev) => ({
        ...prev,
        processingState: 'completed',
        mergedPDF: merged,
        error: null,
      }));
    } catch (err) {
      console.error('Error merging PDFs:', err);
      setState((prev) => ({
        ...prev,
        processingState: 'error',
        error: {
          message:
            'An unexpected error occurred while merging PDFs. Please try again.',
        },
      }));
    }
  };

  const downloadMerged = () => {
    if (!state.mergedPDF) return;
    const link = document.createElement('a');
    link.href = state.mergedPDF.url;
    link.download = `merged_document_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setState({
      files: [],
      processingState: 'idle',
      mergedPDF: null,
      error: null,
    });
  };

  const totalSize = state.files.reduce((sum, f) => sum + f.size, 0);
  const isProcessing = state.processingState === 'processing';

  return (
    <Card variant="elevated" size="md">
      <CardBody>
        <Stack gap="6">
          {state.error && (
            <Alert status="danger" variant="soft">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.error.message}</AlertDescription>
            </Alert>
          )}

          <FileUpload
            accept="application/pdf,.pdf"
            multiple
            maxCount={20}
            value={state.files.map((f) => f.file)}
            onFilesChange={handleFilesChange}
            onError={(err) =>
              setState((prev) => ({
                ...prev,
                error: { message: err.message },
              }))
            }
          />

          {state.files.length > 0 && (
            <Stack gap="3">
              <Inline justify="between" align="center" wrap>
                <Heading level={3} size="md" weight="semibold">
                  Files to merge
                </Heading>
                <Button
                  variant="soft"
                  colorScheme="neutral"
                  size="sm"
                  leftIcon={<RefreshCw size={16} />}
                  onClick={reset}
                >
                  Clear all
                </Button>
              </Inline>

              <Stack gap="2">
                {state.files.map((file, index) => (
                  <Card key={file.id} variant="outlined" size="sm">
                    <CardBody>
                      <Inline justify="between" align="center" gap="3" wrap>
                        <Inline align="center" gap="3">
                          <Badge variant="soft" colorScheme="accent" size="sm">
                            {index + 1}
                          </Badge>
                          <FileText size={20} aria-hidden />
                          <Stack gap="1">
                            <Text size="sm" weight="medium">
                              {file.name}
                            </Text>
                            <Text size="xs" variant="caption">
                              {formatFileSize(file.size)}
                            </Text>
                          </Stack>
                        </Inline>
                        <Inline gap="1">
                          <IconButton
                            variant="ghost"
                            colorScheme="neutral"
                            size="sm"
                            label="Move up"
                            disabled={index === 0}
                            icon={<ChevronUp size={16} />}
                            onClick={() => moveFile(index, -1)}
                          />
                          <IconButton
                            variant="ghost"
                            colorScheme="neutral"
                            size="sm"
                            label="Move down"
                            disabled={index === state.files.length - 1}
                            icon={<ChevronDown size={16} />}
                            onClick={() => moveFile(index, 1)}
                          />
                          <IconButton
                            variant="ghost"
                            colorScheme="danger"
                            size="sm"
                            label={`Remove ${file.name}`}
                            icon={<Trash2 size={16} />}
                            onClick={() => removeFile(file.id)}
                          />
                        </Inline>
                      </Inline>
                    </CardBody>
                  </Card>
                ))}
              </Stack>

              <Card variant="filled" size="sm">
                <CardBody>
                  <Grid columns={2} gap="4">
                    <Stack gap="1" align="center">
                      <Heading level={4} size="xl" weight="bold">
                        {state.files.length}
                      </Heading>
                      <Text size="xs" variant="caption">
                        Files selected
                      </Text>
                    </Stack>
                    <Stack gap="1" align="center">
                      <Heading level={4} size="xl" weight="bold">
                        {formatFileSize(totalSize)}
                      </Heading>
                      <Text size="xs" variant="caption">
                        Total size
                      </Text>
                    </Stack>
                  </Grid>
                </CardBody>
              </Card>
            </Stack>
          )}

          {state.files.length >= 2 && (
            <Button
              onClick={mergePDFs}
              variant="solid"
              colorScheme="accent"
              size="lg"
              fullWidth
              loading={isProcessing}
              leftIcon={
                isProcessing ? <Spinner size="sm" /> : <ArrowDownUp size={20} />
              }
            >
              {isProcessing
                ? 'Merging PDFs…'
                : `Merge ${state.files.length} PDFs`}
            </Button>
          )}

          {state.mergedPDF && state.processingState === 'completed' && (
            <Stack gap="3">
              <Alert status="success" variant="soft">
                <AlertTitle>
                  Successfully merged {state.files.length} PDFs
                </AlertTitle>
                <AlertDescription>
                  {state.mergedPDF.pageCount} pages •{' '}
                  {formatFileSize(state.mergedPDF.size)}
                </AlertDescription>
              </Alert>
              <Button
                onClick={downloadMerged}
                variant="solid"
                colorScheme="success"
                size="lg"
                fullWidth
                leftIcon={<Download size={20} />}
              >
                Download merged PDF
              </Button>
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfMerger;
