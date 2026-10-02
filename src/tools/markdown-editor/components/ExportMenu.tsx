import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { IconChevronDown, IconDownload } from '@/shared/ui/icons';

export interface ExportActions {
  downloadHtml(): void;
  downloadMarkdown(): void;
  copyRich(): void;
  copyHtml(): void;
  print(): void;
}

/** Export: downloads, clipboard copies and print. */
export function ExportMenu({
  actions,
  disabled,
}: {
  actions: ExportActions;
  disabled: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          leftIcon={<IconDownload size="sm" />}
          rightIcon={<IconChevronDown size="sm" />}
        >
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Export" className="min-w-52">
        <DropdownMenuItem onClick={actions.downloadHtml}>
          Download HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={actions.downloadMarkdown}>
          Download Markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={actions.copyRich}>
          Copy rich text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={actions.copyHtml}>
          Copy HTML
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={actions.print}>Print</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
