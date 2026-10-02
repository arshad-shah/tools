import React, { useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import { IconUpload, type IconComponent } from './icons';

export interface DropZoneProps {
  variant: 'hero' | 'inline' | 'fullscreen';
  onFiles(files: File[]): void;
  /** The file input's accept attribute (a hint; callers sniff bytes). */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  title?: React.ReactNode;
  hint?: React.ReactNode;
  /** The keyboard path: a real Button that opens the file chooser. */
  chooseLabel?: string;
  icon?: IconComponent;
  /**
   * fullscreen only: controlled visibility. Compose with useWindowFileDrag,
   * which shows the overlay (`active={dragging}`) and delivers the drop;
   * the overlay never calls onFiles itself.
   */
  active?: boolean;
  className?: string;
}

const hasFiles = (e: React.DragEvent) =>
  Array.from(e.dataTransfer?.types ?? []).includes('Files');

/**
 * File drop target with a keyboard "Choose files" button (spec §4.6).
 * Kind sniffing is the caller's job (detectKind on bytes), never the name.
 */
export function DropZone({
  variant,
  onFiles,
  accept,
  multiple = true,
  disabled,
  title = 'Drop files here',
  hint,
  chooseLabel = 'Choose files',
  icon: Icon = IconUpload,
  active,
  className,
}: DropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []);
    if (!disabled && files.length)
      onFiles(multiple ? files : files.slice(0, 1));
  };

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (disabled || !hasFiles(e)) return;
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      // Moving onto a child element is not leaving the zone.
      const next = e.relatedTarget as Node | null;
      if (next && e.currentTarget.contains(next)) return;
      setOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      take(e.dataTransfer?.files);
    },
  };

  const picker = (
    <input
      ref={input}
      type="file"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      onChange={(e) => {
        take(e.target.files);
        e.target.value = '';
      }}
    />
  );

  if (variant === 'fullscreen') {
    // The window-level hook (useWindowFileDrag) owns drops while the overlay
    // shows: the overlay itself delivers nothing, so a drop lands once.
    if (!active) return null;
    return (
      <div
        data-testid="drop-zone-fullscreen"
        className={cn(
          'fixed inset-0 z-dialog flex items-center justify-center bg-canvas/85 p-6',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-accent bg-surface px-10 py-12 text-center shadow-e3">
          <Icon size="xl" className="text-accent-fg" />
          <p className="text-lg font-semibold text-fg">{title}</p>
          {hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}
        </div>
      </div>
    );
  }

  const hero = variant === 'hero';
  return (
    <div
      {...dropHandlers}
      data-dragging={over || undefined}
      className={cn(
        'flex items-center rounded-xl border border-dashed text-center transition-colors duration-fast',
        hero
          ? 'flex-col justify-center gap-3 px-6 py-12'
          : 'flex-row justify-between gap-4 px-4 py-3 text-left',
        over ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface',
        disabled && 'opacity-50',
        className,
      )}
    >
      <div className={cn('flex items-center gap-3', hero && 'flex-col')}>
        <Icon size={hero ? 'xl' : 'md'} className="text-fg-subtle" />
        <div className={cn('flex flex-col gap-1', hero && 'items-center')}>
          <p
            className={cn(
              'font-semibold text-fg',
              hero ? 'text-lg' : 'text-sm',
            )}
          >
            {title}
          </p>
          {hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}
        </div>
      </div>
      <Button
        variant={hero ? 'primary' : 'secondary'}
        size={hero ? 'md' : 'sm'}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {chooseLabel}
      </Button>
      {picker}
    </div>
  );
}
DropZone.displayName = 'DropZone';
