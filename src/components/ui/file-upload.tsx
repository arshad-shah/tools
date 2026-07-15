import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

/** Click-or-drop file input zone. */
export const FileUpload: React.FC<FileUploadProps> = ({
  onFiles,
  accept,
  multiple,
  disabled,
  className,
  label = 'Click to browse or drop files here',
  hint,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const emit = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) emit(e.dataTransfer.files);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
        dragging
          ? 'border-accent bg-accent/5'
          : 'border-line hover:border-line-strong',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <Upload size={22} className="text-accent" aria-hidden />
      <span className="text-sm text-fg">{label}</span>
      {hint && <span className="font-mono text-xs text-fg-subtle">{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
};
FileUpload.displayName = 'FileUpload';
