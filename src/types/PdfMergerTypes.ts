// src/types/PdfMergerTypes.ts

/**
 * Represents a PDF file in the merger queue
 */
export interface PDFFile {
  /** Unique identifier for the file */
  id: string;
  /** The actual File object */
  file: File;
  /** Original filename */
  name: string;
  /** File size in bytes */
  size: number;
}

/**
 * Result of a successful PDF merge operation
 */
export interface MergedPDFResult {
  /** Blob URL for downloading */
  url: string;
  /** Total size of merged PDF in bytes */
  size: number;
  /** Total number of pages in merged PDF */
  pageCount: number;
}

/**
 * Processing state for the merge operation
 */
export type ProcessingState = 'idle' | 'processing' | 'completed' | 'error';

/**
 * Error details for failed operations
 */
export interface PDFMergerError {
  message: string;
  fileId?: string;
  fileName?: string;
}

/**
 * Main state interface for the PDF merger component
 */
export interface PDFMergerState {
  files: PDFFile[];
  processingState: ProcessingState;
  mergedPDF: MergedPDFResult | null;
  error: PDFMergerError | null;
}

/**
 * Enhanced file drop handlers using react-dropzone
 */
export interface FileDropHandlers {
  handleFilesDrop: (files: File[]) => void;
}

/**
 * File management operations
 */
export interface FileOperations {
  addFiles: (files: FileList) => void;
  removeFile: (id: string) => void;
  moveFile: (fromIndex: number, toIndex: number) => void;
  clearFiles: () => void;
}

/**
 * Merge operation interface
 */
export interface MergeOperations {
  mergePDFs: () => Promise<void>;
  downloadMergedPDF: () => void;
  reset: () => void;
}