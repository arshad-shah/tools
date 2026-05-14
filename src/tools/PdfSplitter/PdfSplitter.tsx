// src/tools/PdfSplitter/PdfSplitter.tsx

import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  Scissors, 
  Download, 
  FileText,
  RefreshCw,
  File,
  Trash2,
  Package,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid3x3,
  Check
} from 'lucide-react';

import { Button } from '../../components/Button';
import { Card, CardContent } from '../../components/Card';
import Alert from '../../components/Alert';
import { FileDropzone } from '../../components/FileDropzone';
import { SortableList } from '../../components/SortableList';
import { ToolProps } from '../../types/ToolTypes';
import {
  SplitMode,
  SplitResult,
  PdfSplitterState,
} from '../../types/PdfSplitterTypes';

/**
 * PDF Splitter Tool Component
 * 
 * Allows users to split PDF files into multiple documents using different methods:
 * - Page ranges: Custom ranges specified by user
 * - Individual pages: One file per page
 * - Every N pages: Split into chunks of N pages
 * 
 * Features:
 * - Drag and drop file upload
 * - Multiple split modes
 * - Progress indication during processing
 * - Batch download functionality
 * - Error handling with user feedback
 * - Responsive design
 * - Accessibility support
 */
const PdfSplitter: React.FC<ToolProps> = () => {
  // Component state
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



  /**
   * Formats file size in bytes to human readable format
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Generates preview images for PDF pages
   */
  const generatePagePreviews = useCallback(async (pdfDoc: PDFDocument) => {
    setState(prev => ({ ...prev, previewLoading: true }));
    
    try {
      const previewUrls: string[] = [];
      const pageCount = pdfDoc.getPageCount();
      
      // Generate preview for all pages (with reasonable limit)
      const pagesToPreview = Math.min(pageCount, 50);
      
      for (let i = 0; i < pagesToPreview; i++) {
        try {
          const singlePageDoc = await PDFDocument.create();
          const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
          singlePageDoc.addPage(copiedPage);
          
          const pdfBytes = await singlePageDoc.save();
          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          previewUrls.push(url);
        } catch (error) {
          console.error(`Failed to generate preview for page ${i + 1}:`, error);
          previewUrls.push('');
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        pagePreviewUrls: previewUrls,
        previewLoading: false 
      }));
    } catch (error) {
      console.error('Failed to generate page previews:', error);
      setState(prev => ({ 
        ...prev, 
        pagePreviewUrls: [],
        previewLoading: false 
      }));
    }
  }, []);

  /**
   * Navigate to previous page in preview
   */
  const goToPreviousPage = () => {
    setState(prev => ({
      ...prev,
      currentPreviewPage: Math.max(0, prev.currentPreviewPage - 1),
    }));
  };

  /**
   * Navigate to next page in preview
   */
  const goToNextPage = () => {
    setState(prev => ({
      ...prev,
      currentPreviewPage: Math.min(prev.pageCount - 1, prev.currentPreviewPage + 1),
    }));
  };

  /**
   * Jump to specific page in preview
   */
  const goToPage = (pageIndex: number) => {
    setState(prev => ({
      ...prev,
      currentPreviewPage: Math.max(0, Math.min(prev.pageCount - 1, pageIndex)),
    }));
  };

  /**
   * Toggle page selection
   */
  const togglePageSelection = (pageIndex: number) => {
    setState(prev => {
      const newSelectedPages = new Set(prev.selectedPages);
      if (newSelectedPages.has(pageIndex)) {
        newSelectedPages.delete(pageIndex);
      } else {
        newSelectedPages.add(pageIndex);
      }
      return { ...prev, selectedPages: newSelectedPages };
    });
  };

  /**
   * Select all pages
   */
  const selectAllPages = () => {
    const allPages = new Set(Array.from({ length: state.pageCount }, (_, i) => i));
    setState(prev => ({ ...prev, selectedPages: allPages }));
  };

  /**
   * Clear all page selections
   */
  const clearPageSelection = () => {
    setState(prev => ({ ...prev, selectedPages: new Set() }));
  };

  /**
   * Toggle preview mode between single and grid
   */
  const togglePreviewMode = () => {
    setState(prev => ({
      ...prev,
      previewMode: prev.previewMode === 'single' ? 'grid' : 'single',
    }));
  };

  /**
   * Handles file selection and loads PDF
   */
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      setState(prev => ({
        ...prev,
        error: { message: 'Please select a valid PDF file' },
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null, previewLoading: true }));
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPageCount();
      
      setState(prev => ({
        ...prev,
        pdfFile: file,
        pdfDoc: pdf,
        pageCount: pages,
        splitResults: [],
        ranges: [{ id: '1', start: '', end: '' }],
        currentPreviewPage: 0,
      }));
      
      // Generate page previews
      await generatePagePreviews(pdf);
    } catch (error) {
      console.error('Failed to load PDF:', error);
      setState(prev => ({
        ...prev,
        error: { message: 'Failed to load PDF. Please ensure it\'s a valid PDF file.' },
        previewLoading: false,
      }));
    }
  }, [generatePagePreviews]);

  /**
   * Enhanced file drop handler using react-dropzone
   */
  const handleFileDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  /**
   * Range management functions
   */
  const addRange = () => {
    const newId = Date.now().toString();
    setState(prev => ({
      ...prev,
      ranges: [...prev.ranges, { id: newId, start: '', end: '' }],
    }));
  };

  const updateRange = (id: string, field: 'start' | 'end', value: string) => {
    setState(prev => {
      const newRanges = prev.ranges.map(range => 
        range.id === id ? { ...range, [field]: value } : range
      );
      return { ...prev, ranges: newRanges };
    });
  };

  const removeRange = (id: string) => {
    setState(prev => {
      if (prev.ranges.length > 1) {
        return {
          ...prev,
          ranges: prev.ranges.filter(range => range.id !== id),
        };
      }
      return prev;
    });
  };

  /**
   * Main split function that handles all split modes
   */
  const splitPDF = async () => {
    if (!state.pdfDoc) return;

    setState(prev => ({
      ...prev,
      processingState: 'processing',
      error: null,
      splitResults: [],
    }));

    try {
      const results: SplitResult[] = [];

      if (state.splitMode === 'individual') {
        // Split into individual pages
        for (let i = 0; i < state.pageCount; i++) {
          const newDoc = await PDFDocument.create();
          const [copiedPage] = await newDoc.copyPages(state.pdfDoc, [i]);
          newDoc.addPage(copiedPage);
          
          const pdfBytes = await newDoc.save();
          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          
          results.push({
            name: `page_${i + 1}.pdf`,
            url,
            pages: `Page ${i + 1}`,
            size: pdfBytes.length,
          });
        }
      } else if (state.splitMode === 'every-n') {
        // Split every N pages
        const n = parseInt(state.everyN.toString());
        if (isNaN(n) || n < 1) {
          setState(prev => ({
            ...prev,
            processingState: 'error',
            error: { message: 'Please enter a valid number of pages' },
          }));
          return;
        }

        for (let i = 0; i < state.pageCount; i += n) {
          const endPage = Math.min(i + n, state.pageCount);
          const newDoc = await PDFDocument.create();
          const pageIndices = Array.from({ length: endPage - i }, (_, idx) => i + idx);
          const copiedPages = await newDoc.copyPages(state.pdfDoc, pageIndices);
          
          copiedPages.forEach(page => newDoc.addPage(page));
          
          const pdfBytes = await newDoc.save();
          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          
          results.push({
            name: `pages_${i + 1}-${endPage}.pdf`,
            url,
            pages: `Pages ${i + 1}-${endPage}`,
            size: pdfBytes.length,
          });
        }
      } else if (state.splitMode === 'selection') {
        // Split selected pages
        if (state.selectedPages.size === 0) {
          setState(prev => ({
            ...prev,
            processingState: 'error',
            error: { message: 'Please select at least one page to extract' },
          }));
          return;
        }

        const selectedPageArray = Array.from(state.selectedPages).sort((a, b) => a - b);
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(state.pdfDoc, selectedPageArray);
        
        copiedPages.forEach(page => newDoc.addPage(page));
        
        const pdfBytes = await newDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const pageList = selectedPageArray.map(i => i + 1).join(', ');
        results.push({
          name: `selected_pages.pdf`,
          url,
          pages: `Pages: ${pageList}`,
          size: pdfBytes.length,
        });
      } else {
        // Split by ranges
        for (let i = 0; i < state.ranges.length; i++) {
          const { start, end } = state.ranges[i];
          const startPage = parseInt(start);
          const endPage = parseInt(end);

          if (isNaN(startPage) || isNaN(endPage)) {
            setState(prev => ({
              ...prev,
              processingState: 'error',
              error: { 
                message: `Invalid page range in split ${i + 1}`,
                rangeIndex: i,
              },
            }));
            return;
          }

          if (startPage < 1 || endPage > state.pageCount || startPage > endPage) {
            setState(prev => ({
              ...prev,
              processingState: 'error',
              error: { 
                message: `Invalid page range ${startPage}-${endPage}. Pages must be between 1 and ${state.pageCount}`,
                rangeIndex: i,
              },
            }));
            return;
          }

          const newDoc = await PDFDocument.create();
          const pageIndices = Array.from(
            { length: endPage - startPage + 1 }, 
            (_, idx) => startPage - 1 + idx
          );
          const copiedPages = await newDoc.copyPages(state.pdfDoc, pageIndices);
          
          copiedPages.forEach(page => newDoc.addPage(page));
          
          const pdfBytes = await newDoc.save();
          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          
          results.push({
            name: `pages_${startPage}-${endPage}.pdf`,
            url,
            pages: `Pages ${startPage}-${endPage}`,
            size: pdfBytes.length,
          });
        }
      }

      setState(prev => ({
        ...prev,
        processingState: 'completed',
        splitResults: results,
      }));
    } catch (error) {
      console.error('Error splitting PDF:', error);
      setState(prev => ({
        ...prev,
        processingState: 'error',
        error: { message: 'Failed to split PDF. Please check your settings and try again.' },
      }));
    }
  };

  /**
   * Downloads a single file
   */
  const downloadFile = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Downloads all split files with staggered timing
   */
  const downloadAll = () => {
    state.splitResults.forEach((result, index) => {
      setTimeout(() => {
        downloadFile(result.url, result.name);
      }, index * 100);
    });
  };

  /**
   * Resets the component state
   */
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

  /**
   * Changes split mode and resets related state
   */
  const changeSplitMode = (mode: SplitMode) => {
    setState(prev => ({
      ...prev,
      splitMode: mode,
      splitResults: [],
      error: null,
    }));
  };

  /**
   * Memoized Page Thumbnail Component for Grid View Performance
   */
  const PageThumbnail = React.memo(({ 
    pageIndex, 
    hasPreview, 
    previewUrl, 
    isSelected, 
    isSelectionMode,
    onPageClick 
  }: {
    pageIndex: number;
    hasPreview: boolean;
    previewUrl?: string;
    isSelected: boolean;
    isSelectionMode: boolean;
    onPageClick: (index: number) => void;
  }) => {
    const handleClick = useCallback(() => {
      onPageClick(pageIndex);
    }, [pageIndex, onPageClick]);

    return (
      <div
        className={`
          relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200
          ${isSelectionMode 
            ? (isSelected 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-slate-200 hover:border-purple-300'
            )
            : 'border-slate-200 hover:border-slate-300'
          }
        `}
        onClick={handleClick}
      >
        {/* Checkbox for selection mode */}
        {isSelectionMode && (
          <div className="absolute top-2 right-2 z-10">
            <div className={`
              w-5 h-5 rounded border-2 flex items-center justify-center
              ${isSelected 
                ? 'bg-purple-600 border-purple-600' 
                : 'bg-white border-slate-300'
              }
            `}>
              {isSelected && <Check size={12} className="text-white" />}
            </div>
          </div>
        )}

        {/* Page Preview */}
        <div className="aspect-[3/4] bg-slate-50 relative">
          {hasPreview && previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0 absolute inset-0"
              title={`Page ${pageIndex + 1} preview`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <FileText size={24} />
              <span className="text-xs mt-1">Page {pageIndex + 1}</span>
            </div>
          )}
        </div>

        {/* Page Number Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 text-center">
          Page {pageIndex + 1}
        </div>
      </div>
    );
  });

  /**
   * PDF Preview Carousel Component
   */
  const PreviewCarousel = () => {
    if (!state.pdfFile || state.pageCount === 0) return null;

    // Page click handler
    const handlePageClick = (pageIndex: number) => {
      if (state.splitMode === 'selection') {
        togglePageSelection(pageIndex);
      } else {
        goToPage(pageIndex);
        setState(prev => ({ ...prev, previewMode: 'single' }));
      }
    };

    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2">
              <Eye size={20} className="text-purple-600" />
              <h3 className="text-lg font-semibold text-slate-900">PDF Preview</h3>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Page Selection Controls */}
              {state.splitMode === 'selection' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllPages}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearPageSelection}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                  <span className="text-sm text-slate-600">
                    {state.selectedPages.size} selected
                  </span>
                </div>
              )}

              {/* View Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={togglePreviewMode}
                leftIcon={state.previewMode === 'single' ? <Grid3x3 size={16} /> : <Eye size={16} />}
                className="text-slate-600"
              >
                {state.previewMode === 'single' ? 'Grid' : 'Single'}
              </Button>
            </div>
          </div>

          {state.previewLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw size={32} className="animate-spin text-purple-600 mb-3" />
              <p className="text-slate-600">Generating preview...</p>
            </div>
          ) : state.previewMode === 'grid' ? (
            /* Grid View - Using Memoized Components */
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {Array.from({ length: state.pageCount }, (_, i) => {
                  const hasPreview = i < state.pagePreviewUrls.length && Boolean(state.pagePreviewUrls[i]);
                  const isSelected = state.selectedPages.has(i);
                  
                  return (
                    <PageThumbnail
                      key={i}
                      pageIndex={i}
                      hasPreview={hasPreview}
                      previewUrl={state.pagePreviewUrls[i]}
                      isSelected={isSelected}
                      isSelectionMode={state.splitMode === 'selection'}
                      onPageClick={handlePageClick}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            /* Single View */
            <div className="space-y-4">
              <div className="text-center text-sm text-slate-600">
                Page {state.currentPreviewPage + 1} of {state.pageCount}
              </div>

              {/* Single Page Preview */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-4 md:p-8 min-h-[400px] flex items-center justify-center">
                {state.currentPreviewPage < state.pagePreviewUrls.length && state.pagePreviewUrls[state.currentPreviewPage] ? (
                  <div className="w-full max-w-2xl">
                    <iframe
                      src={state.pagePreviewUrls[state.currentPreviewPage]}
                      className="w-full h-[500px] border border-slate-200 rounded"
                      style={{ 
                        overflow: 'hidden'
                      }}
                      scrolling="no"
                      title={`Page ${state.currentPreviewPage + 1} preview`}
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-500">
                    <FileText size={48} className="mx-auto mb-2 text-slate-300" />
                    <p>Preview not available for this page</p>
                    <p className="text-sm mt-1">Page {state.currentPreviewPage + 1}</p>
                  </div>
                )}
              </div>

              {/* Navigation for Single View */}
              {state.pageCount > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={state.currentPreviewPage === 0}
                    leftIcon={<ChevronLeft size={16} />}
                    className="text-slate-600 border-slate-300"
                  >
                    Previous
                  </Button>

                  {/* Page indicators for single view */}
                  <div className="flex items-center gap-1 max-w-xs overflow-x-auto">
                    {Array.from({ length: Math.min(state.pageCount, 10) }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => goToPage(i)}
                        className={`
                          w-8 h-8 rounded text-sm font-medium transition-all duration-200 flex-shrink-0
                          ${
                            state.currentPreviewPage === i
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }
                        `}
                        title={`Go to page ${i + 1}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    {state.pageCount > 10 && (
                      <span className="text-slate-400 px-2">...</span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={state.currentPreviewPage === state.pageCount - 1}
                    rightIcon={<ChevronRight size={16} />}
                    className="text-slate-600 border-slate-300"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">

      <Card className="bg-white border-slate-200">

        <CardContent className="space-y-6 p-6">
          {/* Error Display */}
          {state.error && (
            <Alert variant="error" className="border-red-200 bg-red-50" title='Error'>
              <span className="text-red-700">{state.error.message}</span>
            </Alert>
          )}

          {/* Upload Section */}
          {!state.pdfFile && (
            <FileDropzone
              onFileDrop={handleFileDrop}
              accept={{
                'application/pdf': ['.pdf']
              }}
              maxFiles={1}
              multiple={false}
              placeholder="Select or drop PDF file"
              description="Upload a PDF file to split into multiple documents"
              showFileTypes={true}
              fileTypes={['PDF']}
              className="bg-white border-slate-300 hover:border-purple-400 hover:bg-purple-50/50"
              loading={state.previewLoading}
              error={state.error?.message || null}
            />
          )}

          {/* PDF Loaded - Split Options */}
          {state.pdfFile && state.splitResults.length === 0 && (
            <div className="space-y-6">
              {/* File Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <FileText className="w-12 h-12 text-purple-600" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{state.pdfFile.name}</h3>
                    <p className="text-slate-600">{state.pageCount} pages • {formatFileSize(state.pdfFile.size)}</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={reset}
                    leftIcon={<RefreshCw size={16} />}
                  >
                    Change File
                  </Button>
                </div>
              </div>

              {/* PDF Preview */}
              <PreviewCarousel />

              {/* Split Mode Selection */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Split Method</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button
                    variant={state.splitMode === 'range' ? 'primary' : 'outline'}
                    onClick={() => changeSplitMode('range')}
                    className="p-4 h-auto flex-col space-y-2"
                    leftIcon={<Scissors size={24} />}
                  >
                    <div className="font-semibold">Page Ranges</div>
                    <div className="text-xs opacity-75">Custom ranges</div>
                  </Button>

                  <Button
                    variant={state.splitMode === 'individual' ? 'primary' : 'outline'}
                    onClick={() => changeSplitMode('individual')}
                    className="p-4 h-auto flex-col space-y-2"
                    leftIcon={<File size={24} />}
                  >
                    <div className="font-semibold">Individual Pages</div>
                    <div className="text-xs opacity-75">One per page</div>
                  </Button>

                  <Button
                    variant={state.splitMode === 'every-n' ? 'primary' : 'outline'}
                    onClick={() => changeSplitMode('every-n')}
                    className="p-4 h-auto flex-col space-y-2"
                    leftIcon={<Package size={24} />}
                  >
                    <div className="font-semibold">Every N Pages</div>
                    <div className="text-xs opacity-75">Split equally</div>
                  </Button>

                  <Button
                    variant={state.splitMode === 'selection' ? 'primary' : 'outline'}
                    onClick={() => changeSplitMode('selection')}
                    className="p-4 h-auto flex-col space-y-2"
                    leftIcon={<Check size={24} />}
                  >
                    <div className="font-semibold">Select Pages</div>
                    <div className="text-xs opacity-75">Choose visually</div>
                  </Button>
                </div>

                {/* Range Inputs */}
                {state.splitMode === 'range' && (
                  <div className="space-y-3 mt-6">
                    <SortableList
                      items={state.ranges}
                      getItemId={(range) => range.id}
                      onReorder={(reorderedRanges) => {
                        setState(prev => ({ ...prev, ranges: reorderedRanges }));
                      }}
                      renderItem={(range, _index, isDragging, attributes) => (
                        <div 
                          className={`flex items-center p-3 rounded-lg transition-all duration-200 min-h-[80px] ${
                            isDragging ? 'bg-white shadow-lg border border-purple-200' : 'bg-slate-50 border border-slate-200'
                          }`}
                          {...attributes}
                        >
                          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 pl-10 pr-20 md:pl-8 md:pr-4">
                            {/* Mobile: Stack inputs vertically, Desktop: Side by side */}
                            <div className="w-full sm:w-auto sm:flex-1">
                              <label className="block text-xs text-slate-500 mb-1 sm:hidden">From Page</label>
                              <input
                                type="number"
                                placeholder="From"
                                min="1"
                                max={state.pageCount}
                                value={range.start}
                                onChange={(e) => updateRange(range.id, 'start', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                              />
                            </div>
                            <span className="hidden sm:block text-slate-500 font-medium">to</span>
                            <div className="w-full sm:w-auto sm:flex-1">
                              <label className="block text-xs text-slate-500 mb-1 sm:hidden">To Page</label>
                              <input
                                type="number"
                                placeholder="To"
                                min="1"
                                max={state.pageCount}
                                value={range.end}
                                onChange={(e) => updateRange(range.id, 'end', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                              />
                            </div>
                          </div>
                          {/* Remove button with proper spacing */}
                          {state.ranges.length > 1 && (
                            <div className="flex-shrink-0 pl-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRange(range.id)}
                                className="text-slate-500 hover:text-red-600 hover:bg-red-50 p-2 min-w-[40px] min-h-[40px]"
                                aria-label="Remove range"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      className="space-y-2"
                      gap="sm"
                      mobileReorderButtons={true}
                    />
                    <Button
                      variant="outline"
                      onClick={addRange}
                      leftIcon={<Plus size={16} />}
                      className="w-full border-dashed"
                    >
                      Add Range
                    </Button>
                  </div>
                )}

                {/* Every N Pages Input */}
                {state.splitMode === 'every-n' && (
                  <div className="mt-6">
                    <label className="block text-sm text-slate-700 mb-2 font-medium">Split every</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max={state.pageCount}
                        value={state.everyN}
                        onChange={(e) => setState(prev => ({ ...prev, everyN: parseInt(e.target.value) || 1 }))}
                        className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                      <span className="text-slate-600 font-medium">pages</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">
                      This will create {Math.ceil(state.pageCount / state.everyN)} PDF files
                    </p>
                  </div>
                )}

                {/* Selection Mode Instructions */}
                {state.splitMode === 'selection' && (
                  <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="text-purple-600 mt-1">
                        <Check size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-purple-900 mb-1">
                          Visual Page Selection
                        </h4>
                        <p className="text-sm text-purple-800 mb-2">
                          Use the preview above to select pages you want to extract. Click on pages in grid view to select/deselect them.
                        </p>
                        <div className="text-xs text-purple-700">
                          • Switch to grid view to see all pages at once<br/>
                          • Click pages to select them for extraction<br/>
                          • Use "Select All" or "Clear All" for quick selection
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual Pages Info */}
                {state.splitMode === 'individual' && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-slate-700">
                      This will create <span className="font-semibold text-slate-900">{state.pageCount}</span> separate PDF files, one for each page.
                    </p>
                  </div>
                )}
              </div>

              {/* Split Button */}
              <Button
                onClick={splitPDF}
                disabled={state.processingState === 'processing'}
                className="w-full"
                size="lg"
                leftIcon={state.processingState === 'processing' ? 
                  <RefreshCw size={20} className="animate-spin" /> : 
                  <Scissors size={20} />
                }
              >
                {state.processingState === 'processing' ? 'Splitting PDF...' : 'Split PDF'}
              </Button>
            </div>
          )}

          {/* Results */}
          {state.splitResults.length > 0 && (
            <div className="space-y-6">
              {/* Success Message */}
              <Alert variant="success" className="border-green-200 bg-green-50">
                <div className="text-green-800">
                  <div className="font-semibold">
                    Successfully split into {state.splitResults.length} files!
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    Download individual files or all at once
                  </div>
                </div>
              </Alert>

              {/* Download All Button */}
              <Button
                onClick={downloadAll}
                variant="success"
                size="lg"
                leftIcon={<Package size={20} />}
                className="w-full"
              >
                Download All Files
              </Button>

              {/* File List */}
              <div className="space-y-2">
                {state.splitResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all duration-200"
                  >
                    <FileText size={20} className="text-purple-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{result.name}</p>
                      <p className="text-sm text-slate-600">{result.pages} • {formatFileSize(result.size)}</p>
                    </div>
                    <Button
                      onClick={() => downloadFile(result.url, result.name)}
                      size="sm"
                      leftIcon={<Download size={16} />}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>

              {/* Reset Button */}
              <Button
                onClick={reset}
                variant="outline"
                leftIcon={<RefreshCw size={16} />}
                className="w-full"
              >
                Split Another PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PdfSplitter;