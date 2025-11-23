// src/tools/PdfMerger/PdfMerger.tsx

import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  Trash2, 
  Download, 
  FileText,
  ArrowDownUp,
  RefreshCw
} from 'lucide-react';

import { Button } from '../../components/Button';
import { Card, CardContent } from '../../components/Card';
import Alert from '../../components/Alert';
import { FileDropzone } from '../../components/FileDropzone';
import { SortableList } from '../../components/SortableList';
import { ToolProps } from '../../types/ToolTypes';
import {
  PDFFile,
  MergedPDFResult,
  PDFMergerState,
} from '../../types/PdfMergerTypes';

/**
 * PDF Merger Tool Component
 * 
 * Allows users to merge multiple PDF files into a single document.
 * Features:
 * - Drag and drop file upload
 * - File reordering via drag and drop
 * - Progress indication during merge
 * - Error handling with user feedback
 * - Responsive design
 * - Accessibility support
 */
const PdfMerger: React.FC<ToolProps> = () => {
  // Component state
  const [state, setState] = useState<PDFMergerState>({
    files: [],
    processingState: 'idle',
    mergedPDF: null,
    error: null,
  });



  /**
   * Formats file size in bytes to human readable format
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Validates and processes selected files
   */
  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: PDFFile[] = Array.from(selectedFiles)
      .filter(file => {
        if (file.type !== 'application/pdf') {
          setState(prev => ({
            ...prev,
            error: {
              message: `"${file.name}" is not a valid PDF file. Only PDF files are accepted.`,
            },
          }));
          return false;
        }
        return true;
      })
      .map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
      }));

    setState(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles],
      mergedPDF: null,
      error: null,
    }));
  };

  /**
   * Enhanced file drop handler using react-dropzone
   */
  const handleFilesDrop = useCallback((files: File[]) => {
    // Create a FileList-like object for the existing handler
    const fileListLike = Object.assign(files, { 
      item: (index: number) => files[index],
      length: files.length
    });
    
    handleFileSelect(fileListLike as FileList);
  }, []);

  /**
   * Removes a file from the queue
   */
  const removeFile = (id: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== id),
      mergedPDF: null,
      error: null,
    }));
  };

  // File reordering is now handled by SortableList component

  // Note: Drag and drop is now handled by SortableList component
  // Old drag handlers removed to prevent conflicts with mobile touch

  /**
   * Merges all PDF files into a single document
   */
  const mergePDFs = async () => {
    if (state.files.length < 2) {
      setState(prev => ({
        ...prev,
        error: { message: 'Please add at least 2 PDF files to merge.' },
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      processingState: 'processing',
      error: null 
    }));

    try {
      const mergedDoc = await PDFDocument.create();

      for (const fileItem of state.files) {
        try {
          const pdfBytes = await fileItem.file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = await mergedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());

          pages.forEach(page => {
            mergedDoc.addPage(page);
          });
        } catch (error) {
          console.error(`Error processing file: ${fileItem.name}`, error);
          setState(prev => ({
            ...prev,
            processingState: 'error',
            error: {
              message: `Failed to process "${fileItem.name}". Please ensure it's a valid PDF file.`,
              fileId: fileItem.id,
              fileName: fileItem.name,
            },
          }));
          return;
        }
      }

      const mergedPdfBytes = await mergedDoc.save();
      const blob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const mergedPDF: MergedPDFResult = {
        url,
        size: mergedPdfBytes.length,
        pageCount: mergedDoc.getPageCount(),
      };

      setState(prev => ({
        ...prev,
        processingState: 'completed',
        mergedPDF,
        error: null,
      }));
    } catch (error) {
      console.error('Error merging PDFs:', error);
      setState(prev => ({
        ...prev,
        processingState: 'error',
        error: {
          message: 'An unexpected error occurred while merging PDFs. Please try again.',
        },
      }));
    }
  };

  /**
   * Downloads the merged PDF
   */
  const downloadMergedPDF = () => {
    if (!state.mergedPDF) return;

    const link = document.createElement('a');
    link.href = state.mergedPDF.url;
    link.download = `merged_document_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Resets the component state
   */
  const reset = () => {
    setState({
      files: [],
      processingState: 'idle',
      mergedPDF: null,
      error: null,
    });
  };

  /**
   * Calculates total size of all files
   */
  const getTotalSize = (): number => {
    return state.files.reduce((sum, file) => sum + file.size, 0);
  };

  return (
    <div className="space-y-6">

      <Card className="bg-white border-slate-200">

        <CardContent className="space-y-6">
          {/* Error Display */}
          {state.error && (
            <Alert variant="error" title='Error'>
              <span>{state.error.message}</span>
            </Alert>
          )}

          {/* Drop Zone */}
          <FileDropzone
            onFileDrop={handleFilesDrop}
            accept={{
              'application/pdf': ['.pdf']
            }}
            multiple={true}
            maxFiles={20}
            placeholder="Select or drop PDF files"
            description="Choose multiple PDF files to merge into a single document"
            showFileTypes={true}
            fileTypes={['PDF']}
            className="bg-white border-lime-300 hover:border-lime-400 hover:bg-lime-50/50"
            error={state.error?.message || null}
          />

          {/* File List */}
          {state.files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Files to Merge</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  className="text-slate-400"
                  leftIcon={<RefreshCw size={16} />}
                >
                  Clear All
                </Button>
              </div>

              <SortableList
                items={state.files}
                getItemId={(file) => file.id}
                onReorder={(reorderedFiles) => {
                  setState(prev => ({ ...prev, files: reorderedFiles }));
                }}
                renderItem={(file, _index, isDragging, attributes) => (
                  <div
                    className={`
                      flex items-center p-1 rounded-lg border transition-all duration-200 min-h-[80px]
                      ${isDragging 
                        ? 'bg-white border-lime-400 shadow-lg' 
                        : 'bg-lime-50/50 border-lime-200 hover:bg-lime-100/50 hover:border-lime-300'
                      }
                    `}
                    {...attributes}
                  >
                    {/* Icon with proper spacing for drag handle */}
                    <div className="flex items-center pl-10 pr-3 md:pl-8 md:pr-2">
                      <FileText size={20} className="text-lime-600 flex-shrink-0" />
                    </div>
                    
                    {/* File info with mobile spacing */}
                    <div className="flex-1 min-w-0 pr-10 md:pr-4">
                      <p className="font-medium text-slate-900 truncate text-sm md:text-base">
                        {file.name}
                      </p>
                      <p className="text-xs md:text-sm text-slate-600 mt-1">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    
                    {/* Remove button with proper spacing */}
                    <div className="flex-shrink-0 ml-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-slate-400 hover:text-red-400 p-2 min-w-[40px] min-h-[40px]"
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                )}
                className="space-y-2"
                gap="sm"
                mobileReorderButtons={true}
              />
            </div>
          )}

          {/* Statistics */}
          {state.files.length > 0 && (
            <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{state.files.length}</p>
                <p className="text-slate-600 text-sm">Files Selected</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{formatFileSize(getTotalSize())}</p>
                <p className="text-slate-600 text-sm">Total Size</p>
              </div>
            </div>
          )}

          {/* Merge Action */}
          {state.files.length >= 2 && (
            <div className="space-y-4">
              <Button
                onClick={mergePDFs}
                disabled={state.processingState === 'processing'}
                className="w-full py-3 text-lg font-semibold"
                size="lg"
                leftIcon={
                    state.processingState === 'processing' ? (
                        <RefreshCw size={20} className="animate-spin mr-2" />
                    ) : (
                        <ArrowDownUp size={20} className="mr-2" />
                    )
                }
              >
                {state.processingState === 'processing' ? (
                  <>
                    Merging PDFs...
                  </>
                ) : (
                  <>
                    Merge {state.files.length} PDFs
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Success State with Download */}
          {state.mergedPDF && state.processingState === 'completed' && (
            <div className="space-y-4">
              <Alert variant="success" title="Success">
                <div>
                  <div className="font-semibold">
                    Successfully merged {state.files.length} PDFs!
                  </div>
                  <div className="text-sm mt-1">
                    {state.mergedPDF.pageCount} pages • {formatFileSize(state.mergedPDF.size)}
                  </div>
                </div>
              </Alert>

              <Button
                onClick={downloadMergedPDF}
                variant="success"
                size="lg"
                className="w-full py-3 text-lg font-semibold"
                leftIcon={<Download size={20} className="mr-2" />}
              >
                Download Merged PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PdfMerger;