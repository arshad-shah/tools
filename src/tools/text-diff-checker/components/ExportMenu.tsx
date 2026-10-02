import { IconDownload } from '@/shared/ui/icons';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { copyText } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { readThemeTokens } from '@/shared/lib/theme-tokens';
import type { DiffResult } from '../lib/engine';
import {
  REPORT_TOKEN_NAMES,
  toHtmlReport,
  type ReportTokens,
} from '../lib/html-export';
import { toUnifiedPatch } from '../lib/patch';

interface ExportMenuProps {
  result: DiffResult | null;
  texts: { left: string; right: string };
  names: { left: string; right: string };
}

function reportTokens(): ReportTokens {
  const names = Object.values(REPORT_TOKEN_NAMES);
  const read = readThemeTokens(names);
  const out = {} as ReportTokens;
  for (const [k, name] of Object.entries(REPORT_TOKEN_NAMES))
    out[k as keyof ReportTokens] = read[name];
  return out;
}

/** Unified patch (copy or download) and the standalone HTML report. */
export function ExportMenu({ result, texts, names }: ExportMenuProps) {
  const patch = () =>
    toUnifiedPatch(names.left, names.right, texts.left, texts.right);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="secondary" size="sm" disabled={!result}>
          <IconDownload size="sm" aria-hidden />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            void copyText(patch()).then(
              () => notify.success('Patch copied'),
              () => notify.error('Could not copy to clipboard'),
            )
          }
        >
          Copy patch
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            saveBlob(
              new Blob([patch()], { type: 'text/x-diff' }),
              'changes.patch',
            )
          }
        >
          Download .patch
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            result &&
            saveBlob(
              new Blob([toHtmlReport(result, texts, names, reportTokens())], {
                type: 'text/html',
              }),
              'diff-report.html',
            )
          }
        >
          Download HTML report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
