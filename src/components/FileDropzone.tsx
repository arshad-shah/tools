// src/components/FileDropzone.tsx

import React, { useCallback } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { Upload, FileText, X, Check } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/utils';

export interface FileDropzoneProps {
  /** Callback when files are accepted */
  onFileDrop: (files: File[]) => void;
  /** Accept specific file types (MIME types) */
  accept?: Record<string, string[]>;
  /** Maximum number of files to accept */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Whether multiple files are allowed */
  multiple?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Custom description text */
  description?: string;
  /** Whether the dropzone is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Show file type indicators */
  showFileTypes?: boolean;
  /** Custom accepted file types for display */
  fileTypes?: string[];
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string | null;
  /** Success state */
  success?: boolean;
}

/**
 * Enhanced file dropzone component with excellent mobile and desktop support
 * Uses react-dropzone for better touch handling and accessibility
 */
export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileDrop,
  accept,
  maxFiles = 1,
  maxSize,
  multiple = false,
  placeholder = "Drop files here or click to browse",
  description = "Drag and drop files here, or click to select files",
  disabled = false,
  className,
  showFileTypes = true,
  fileTypes,
  loading = false,
  error = null,
  success = false,
}) => {
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileDrop(acceptedFiles);
  }, [onFileDrop]);

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept,
    maxFiles,
    maxSize,
    multiple,
    disabled: disabled || loading,
    noClick: disabled || loading,
    noKeyboard: disabled || loading,
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    isFocused,
  } = useDropzone(dropzoneOptions);

  // Determine the state-based styling
  const getDropzoneState = () => {
    if (error) return 'error';
    if (success) return 'success';
    if (isDragReject) return 'reject';
    if (isDragAccept) return 'accept';
    if (isDragActive) return 'active';
    if (isFocused) return 'focused';
    if (loading) return 'loading';
    return 'idle';
  };

  const state = getDropzoneState();

  const stateStyles = {
    idle: 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100',
    focused: 'border-blue-400 bg-blue-50 ring-2 ring-blue-100',
    active: 'border-blue-500 bg-blue-100 scale-[1.02]',
    accept: 'border-green-500 bg-green-50 scale-[1.02]',
    reject: 'border-red-500 bg-red-50 scale-[0.98]',
    loading: 'border-slate-300 bg-slate-50 opacity-60',
    error: 'border-red-400 bg-red-50',
    success: 'border-green-400 bg-green-50',
  };

  const iconStyles = {
    idle: 'text-slate-400',
    focused: 'text-blue-500',
    active: 'text-blue-600',
    accept: 'text-green-600',
    reject: 'text-red-600', 
    loading: 'text-slate-400 animate-pulse',
    error: 'text-red-500',
    success: 'text-green-600',
  };

  const textStyles = {
    idle: 'text-slate-600',
    focused: 'text-blue-700',
    active: 'text-blue-700', 
    accept: 'text-green-700',
    reject: 'text-red-700',
    loading: 'text-slate-500',
    error: 'text-red-600',
    success: 'text-green-600',
  };

  // Get the appropriate icon based on state
  const getIcon = () => {
    if (loading) return <Upload size={48} className="animate-bounce" />;
    if (error) return <X size={48} />;
    if (success) return <Check size={48} />;
    if (isDragActive && isDragAccept) return <FileText size={48} />;
    if (isDragActive && isDragReject) return <X size={48} />;
    return <Upload size={48} />;
  };

  // Get display text based on state
  const getDisplayText = () => {
    if (loading) return "Processing...";
    if (error) return "Upload failed";
    if (success) return "Upload successful!";
    if (isDragActive && isDragAccept) return `Drop ${multiple ? 'files' : 'file'} here`;
    if (isDragActive && isDragReject) return "File type not supported";
    if (isDragActive) return "Drop here...";
    return placeholder;
  };

  const getDescriptionText = () => {
    if (error) return error;
    if (success) return "File processed successfully";
    if (loading) return "Please wait while we process your file";
    if (isDragReject) return "This file type is not supported";
    return description;
  };

  return (
    <div 
      {...getRootProps()}
      className={cn(
        // Base styles
        'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        // Touch-friendly padding on mobile
        'touch-manipulation select-none',
        // State-based styles
        stateStyles[state],
        // Disabled state
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={`File dropzone. ${description}`}
      aria-disabled={disabled}
    >
      <input {...getInputProps()} />
      
      {/* Main icon */}
      <div className={cn('mx-auto mb-4 transition-colors duration-300 flex justify-center', iconStyles[state])}>
        {getIcon()}
      </div>

      {/* Main text */}
      <h3 className={cn('text-lg font-semibold mb-2 transition-colors duration-300', textStyles[state])}>
        {getDisplayText()}
      </h3>

      {/* Description */}
      <p className={cn('text-sm mb-4 transition-colors duration-300', textStyles[state])}>
        {getDescriptionText()}
      </p>

      {/* File type indicators */}
      {showFileTypes && fileTypes && !loading && !error && !success && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {fileTypes.map((type) => (
            <span
              key={type}
              className="px-2 py-1 text-xs rounded-full bg-slate-200 text-slate-600 font-medium"
            >
              {type}
            </span>
          ))}
        </div>
      )}

      {/* Mobile-specific upload button */}
      <div className="block sm:hidden mt-6">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          className="bg-white"
          leftIcon={<Upload size={16} />}
        >
          Browse Files
        </Button>
      </div>

      {/* Accessibility instructions */}
      <div className="sr-only">
        {multiple ? 'Select multiple files' : 'Select a file'} to upload.
        You can drag and drop files or click to browse.
        {fileTypes && ` Supported formats: ${fileTypes.join(', ')}.`}
        {maxSize && ` Maximum file size: ${Math.round(maxSize / 1024 / 1024)}MB.`}
      </div>
    </div>
  );
};

export default FileDropzone;