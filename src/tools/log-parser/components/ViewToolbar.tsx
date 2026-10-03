import {
  Button,
  ControlBar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Select,
  SwitchField,
  ToolActions,
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
import type { LogColumn, SavedFormat } from '../settings';
import { ColumnMenu } from './ColumnMenu';

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
  columns: readonly LogColumn[];
  onColumns(columns: LogColumn[]): void;
  hasLog: boolean;
  onNextError(): void;
  onExport(fmt: ExportFormat): void;
  selectedCount: number;
  onCompare(): void;
}

/** Format picker, wrap, columns, next error, compare and export. */
export function ViewToolbar({
  format,
  onFormat,
  customFormats,
  onNewFormat,
  wrap,
  onWrap,
  columns,
  onColumns,
  hasLog,
  onNextError,
  onExport,
  selectedCount,
  onCompare,
}: ViewToolbarProps) {
  const { items, groups } = formatOptions(customFormats);
  return (
    <>
      <ToolActions>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              size="sm"
              variant="secondary"
              disabled={!hasLog}
              leftIcon={<IconDownload size="sm" />}
              rightIcon={<IconChevronDown size="sm" />}
            >
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" aria-label="Export formats">
            {EXPORT_FORMATS.map((e) => (
              <DropdownMenuItem key={e.fmt} onClick={() => onExport(e.fmt)}>
                {e.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </ToolActions>
      <ControlBar
        start={
          <>
            <div className="w-48">
              <Select
                aria-label="Log format"
                size="sm"
                value={format}
                onValueChange={onFormat}
                items={items}
                groups={groups}
              />
            </div>
            <IconButton
              size="sm"
              variant="ghost"
              label="Custom format"
              icon={IconPlus}
              onClick={onNewFormat}
            />
            <ColumnMenu columns={columns} onColumns={onColumns} />
            <SwitchField
              label="Wrap lines"
              checked={wrap}
              onCheckedChange={onWrap}
            />
          </>
        }
        end={
          <>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<IconSplit size="sm" />}
              disabled={selectedCount !== 2}
              onClick={onCompare}
            >
              Compare selected
              {selectedCount > 0 ? ` (${selectedCount} of 2)` : ''}
            </Button>
            <Tooltip content="Jump to next error" shortcut="e">
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconAlertTriangle size="sm" />}
                disabled={!hasLog}
                onClick={onNextError}
              >
                Next error
              </Button>
            </Tooltip>
          </>
        }
      />
    </>
  );
}
