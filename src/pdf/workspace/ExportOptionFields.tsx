import { Switch } from '@arshad-shah/cynosure';
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
  const selected = (options.selectedPages as PageId[] | undefined) ?? [];
  const n = selected.length;
  return (
    <Switch
      label="Export selected pages"
      description={
        n
          ? `${n} ${n === 1 ? 'page is' : 'pages are'} selected in the page rail`
          : 'Select pages in the page rail first'
      }
      checked={options.onlyPages !== null}
      disabled={n === 0}
      onChange={(on) => set({ onlyPages: on ? selected : null })}
    />
  );
}

/** "Remove document properties" (Info dictionary and XMP). */
export function MetadataOption({ options, set }: FieldProps) {
  return (
    <Switch
      label="Remove document properties"
      description="Title, author, dates and other properties are left out."
      checked={options.stripMetadata}
      onChange={(stripMetadata) => set({ stripMetadata })}
    />
  );
}
