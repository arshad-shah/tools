import { useId } from 'react';
import { Label, Switch, Text } from '@/shared/ui';
import type { ExportOptions } from '@/pdf/doc/export-stages';
import type { PageId } from '@/pdf/doc/types';
import type { DocumentApi } from './modes/types';

interface FieldProps {
  doc: DocumentApi;
  options: ExportOptions;
  set(patch: Partial<ExportOptions>): void;
}

/** "Export selected pages": the rail selection captured when the dialog opened. */
export function PagesOption({ options, set }: FieldProps) {
  const id = useId();
  const selected = (options.selectedPages as PageId[] | undefined) ?? [];
  const n = selected.length;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>Export selected pages</Label>
        <Text size="sm" tone="muted">
          {n
            ? `${n} ${n === 1 ? 'page is' : 'pages are'} selected in the page rail`
            : 'Select pages in the page rail first'}
        </Text>
      </div>
      <Switch
        id={id}
        checked={options.onlyPages !== null}
        disabled={n === 0}
        onCheckedChange={(on) => set({ onlyPages: on ? selected : null })}
      />
    </div>
  );
}

/** "Remove document properties" (Info dictionary and XMP). */
export function MetadataOption({ options, set }: FieldProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>Remove document properties</Label>
        <Text size="sm" tone="muted">
          Title, author, dates and other properties are left out.
        </Text>
      </div>
      <Switch
        id={id}
        checked={options.stripMetadata}
        onCheckedChange={(stripMetadata) => set({ stripMetadata })}
      />
    </div>
  );
}
