import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  Switch,
  Tooltip,
} from '@/shared/ui';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconDownload,
  IconPlus,
  IconSplit,
} from '@/shared/ui/icons';
import type { ExportFormat } from '../hooks/useLogSource';
import { formatOptions } from '../lib/format-ref';
import type { SavedFormat } from '../settings';

const EXPORT_FORMATS: { fmt: ExportFormat; label: string }[] = [
  { fmt: 'text', label: 'Export as text' },
  { fmt: 'json', label: 'Export as JSON' },
  { fmt: 'csv', label: 'Export as CSV' },
];

export interface ViewToolbarProps {
  format: string;
  onFormat(id: string): void;
  customFormats: readonly SavedFormat[];
  onNewFormat(): void;
  wrap: boolean;
  onWrap(wrap: boolean): void;
  hasLog: boolean;
  onNextError(): void;
  onExport(fmt: ExportFormat): void;
  selectedCount: number;
  onCompare(): void;
}

/** Format picker, wrap, next error, compare and export. */
export function ViewToolbar({
  format,
  onFormat,
  customFormats,
  onNewFormat,
  wrap,
  onWrap,
  hasLog,
  onNextError,
  onExport,
  selectedCount,
  onCompare,
}: ViewToolbarProps) {
  const { items, groups } = formatOptions(customFormats);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-48">
        <Select
          aria-label="Log format"
          className="h-8 text-sm"
          value={format}
          onValueChange={onFormat}
          items={items}
          groups={groups}
        />
      </div>
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<IconPlus size="sm" />}
        onClick={onNewFormat}
      >
        Custom format
      </Button>
      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <Switch
          aria-label="Wrap lines"
          checked={wrap}
          onCheckedChange={onWrap}
        />
        Wrap
      </label>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Tooltip content="Jump to next error" shortcut="e">
          <Button
            size="sm"
            leftIcon={<IconAlertTriangle size="sm" />}
            disabled={!hasLog}
            onClick={onNextError}
          >
            Jump to next error
          </Button>
        </Tooltip>
        <Button
          size="sm"
          leftIcon={<IconSplit size="sm" />}
          disabled={selectedCount !== 2}
          onClick={onCompare}
        >
          Compare selected
          {selectedCount > 0 ? ` (${selectedCount} of 2)` : ''}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              size="sm"
              disabled={!hasLog}
              leftIcon={<IconDownload size="sm" />}
              rightIcon={<IconChevronDown size="sm" />}
            >
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent aria-label="Export formats">
            {EXPORT_FORMATS.map((e) => (
              <DropdownMenuItem key={e.fmt} onClick={() => onExport(e.fmt)}>
                {e.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
