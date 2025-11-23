// src/types/PdfSplitterTypes.ts

import { PDFDocument } from 'pdf-lib';

/**
 * Represents split mode options for the PDF splitter
 */
export type SplitMode = 'range' | 'individual' | 'every-n' | 'selection';

/**
 * Represents a page range for splitting
 */
export interface PageRange {
  /** Unique identifier for the range */
  id: string;
  /** Starting page number (1-indexed) */
  start: string;
  /** Ending page number (1-indexed) */
  end: string;
}

/**
 * Result of a split PDF operation
 */
export interface SplitResult {
  /** Generated filename */
  name: string;
  /** Blob URL for downloading */
  url: string;
  /** Description of pages included */
  pages: string;
  /** File size in bytes */
  size: number;
}

/**
 * Processing state for the split operation
 */
export type ProcessingState = 'idle' | 'processing' | 'completed' | 'error';

/**
 * Error details for failed operations
 */
export interface PdfSplitterError {
  message: string;
  rangeIndex?: number;
}

/**
 * Main state interface for the PDF splitter component
 */
export interface PdfSplitterState {
  /** Selected PDF file */
  pdfFile: File | null;
  /** Loaded PDF document object */
  pdfDoc: PDFDocument | null;
  /** Total number of pages in the PDF */
  pageCount: number;
  /** Current split mode */
  splitMode: SplitMode;
  /** Page ranges for range mode */
  ranges: PageRange[];
  /** Number of pages for every-n mode */
  everyN: number;
  /** Current processing state */
  processingState: ProcessingState;
  /** Results of split operation */
  splitResults: SplitResult[];
  /** Current error, if any */
  error: PdfSplitterError | null;
  /** Array of page preview URLs */
  pagePreviewUrls: string[];
  /** Currently selected page in preview */
  currentPreviewPage: number;
  /** Whether preview is loading */
  previewLoading: boolean;
  /** Set of selected page numbers (0-indexed) for selection mode */
  selectedPages: Set<number>;
  /** View mode for preview: 'single' or 'grid' */
  previewMode: 'single' | 'grid';
}

/**
 * File management operations
 */
export interface FileOperations {
  handleFileSelect: (file: File) => Promise<void>;
  reset: () => void;
}

/**
 * Range management operations
 */
export interface RangeOperations {
  addRange: () => void;
  updateRange: (index: number, field: 'start' | 'end', value: string) => void;
  removeRange: (index: number) => void;
}

/**
 * Split operations
 */
export interface SplitOperations {
  splitPDF: () => Promise<void>;
  downloadFile: (url: string, name: string) => void;
  downloadAll: () => void;
}

/**
 * Enhanced file drop handlers using react-dropzone
 */
export interface FileDropHandlers {
  handleFileDrop: (files: File[]) => void;
}