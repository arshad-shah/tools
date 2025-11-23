// src/tools/PdfMerger/PdfMerger.tsx

import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  Upload, 
  Trash2, 
  Download, 
  GripVertical, 
  FileText,
  ArrowDownUp,
  RefreshCw
} from 'lucide-react';

import { Button } from '../../components/Button';
import { Card, CardContent } from '../../components/Card';
import Alert from '../../components/Alert';
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
    isDragging: false,
    draggedItemIndex: null,
    dragOverItemIndex: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

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
   * Drag and drop handlers
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: false }));
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeavingDropzone = 
      e.clientX < rect.left || 
      e.clientX > rect.right || 
      e.clientY < rect.top || 
      e.clientY > rect.bottom;
    
    if (isLeavingDropzone) {
      setState(prev => ({ ...prev, isDragging: false }));
    }
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

  /**
   * Moves a file to a new position in the queue
   */
  const moveFile = (fromIndex: number, toIndex: number) => {
    setState(prev => {
      const updatedFiles = [...prev.files];
      const [movedFile] = updatedFiles.splice(fromIndex, 1);
      updatedFiles.splice(toIndex, 0, movedFile);
      return {
        ...prev,
        files: updatedFiles,
        mergedPDF: null,
      };
    });
  };

  /**
   * File item drag handlers
   */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setState(prev => ({ ...prev, draggedItemIndex: index }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnterItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setState(prev => ({ ...prev, dragOverItemIndex: index }));
  };

  const handleDragEnd = () => {
    const { draggedItemIndex, dragOverItemIndex } = state;
    if (
      draggedItemIndex !== null && 
      dragOverItemIndex !== null && 
      draggedItemIndex !== dragOverItemIndex
    ) {
      moveFile(draggedItemIndex, dragOverItemIndex);
    }
    setState(prev => ({
      ...prev,
      draggedItemIndex: null,
      dragOverItemIndex: null,
    }));
  };

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
  const resetState = () => {
    setState({
      files: [],
      processingState: 'idle',
      mergedPDF: null,
      error: null,
      isDragging: false,
      draggedItemIndex: null,
      dragOverItemIndex: null,
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
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
              ${state.isDragging 
                ? 'border-blue-400 bg-blue-400/10' 
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
              }
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Drop PDF files here or click to select"
          >
            <Upload size={48} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold mb-2 text-slate-900">
              {state.isDragging ? 'Drop PDF files here' : 'Select or drop PDF files'}
            </h3>
            <p className="text-slate-600">
              Choose multiple PDF files to merge into a single document
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="application/pdf"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              aria-hidden="true"
            />
          </div>

          {/* File List */}
          {state.files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Files to Merge</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetState}
                  className="text-slate-400"
                  leftIcon={<RefreshCw size={16} />}
                >
                  Clear All
                </Button>
              </div>

              <div className="space-y-2">
                {state.files.map((file, index) => (
                  <div
                    key={file.id}
                    className={`
                      flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200
                      transition-all duration-200
                      ${state.draggedItemIndex === index ? 'opacity-50 scale-95' : ''}
                      ${state.dragOverItemIndex === index ? 'border-blue-400 bg-blue-50' : ''}
                      hover:bg-slate-100
                    `}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnterItem(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <GripVertical 
                      size={20} 
                      className="text-slate-400 cursor-grab active:cursor-grabbing" 
                      aria-label="Drag to reorder"
                    />
                    <FileText size={20} className="text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{file.name}</p>
                      <p className="text-sm text-slate-600">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-slate-400 hover:text-red-400 p-2"
                      aria-label={`Remove ${file.name}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
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