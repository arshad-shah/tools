// src/types/PdfCompressorTypes.ts

export type CompressionLevel = 'low' | 'medium' | 'high' | 'maximum';

export interface CompressionSettings {
  name: string;
  description: string;
  imageQuality: number;
  imageScale: number;
  expectedReduction: string;
}

export interface CompressedPdfResult {
  url: string;
  size: number;
  name: string;
}

export interface PdfCompressorError {
  message: string;
}

export interface PdfCompressorState {
  pdfFile: File | null;
  originalSize: number;
  compressionLevel: CompressionLevel;
  processing: boolean;
  compressedPDF: CompressedPdfResult | null;
  error: PdfCompressorError | null;
  isDragging: boolean;
  processingState: 'idle' | 'processing' | 'completed' | 'error';
}

export const COMPRESSION_SETTINGS: Record<CompressionLevel, CompressionSettings> = {
  low: {
    name: 'Low Compression',
    description: 'Minimal size reduction, maximum quality',
    imageQuality: 0.95,
    imageScale: 1.0,
    expectedReduction: '10-20%'
  },
  medium: {
    name: 'Medium Compression',
    description: 'Balanced size and quality',
    imageQuality: 0.85,
    imageScale: 0.9,
    expectedReduction: '30-40%'
  },
  high: {
    name: 'High Compression',
    description: 'Smaller size, good quality',
    imageQuality: 0.70,
    imageScale: 0.8,
    expectedReduction: '50-60%'
  },
  maximum: {
    name: 'Maximum Compression',
    description: 'Smallest size, reduced quality',
    imageQuality: 0.50,
    imageScale: 0.7,
    expectedReduction: '70-80%'
  }
};
