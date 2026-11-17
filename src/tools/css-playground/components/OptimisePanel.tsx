import {
  Button,
  CodeBlock,
  Grid,
  Inline,
  LoadingDots,
  Notice,
  Stack,
  Stat,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { download, wand } from '@arshad-shah/cynosure/icons';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import type { Job } from '../hooks/useCssWorker';
import type { OptimiseOptions, OptimiseResult } from '../lib/types';

export interface OptimisePanelProps {
  job: Job<OptimiseResult>;
  options: OptimiseOptions;
  onOptions(patch: Partial<OptimiseOptions>): void;
  onReplace(css: string): void;
  onDownload(css: string): void;
}

const saving = (before: number, after: number) => ({
  value: formatSizeChange(before, after),
  direction: after < before ? ('down' as const) : ('flat' as const),
  tone: after < before ? ('success' as const) : ('neutral' as const),
});

/**
 * csso's minifier and structural optimiser: what it removes, how much
 * smaller the file is (raw and gzipped), and the result to copy, download
 * or load back into the editor.
 */
export function OptimisePanel({
  job,
  options,
  onOptions,
  onReplace,
  onDownload,
}: OptimisePanelProps) {
  const r = job.value;
  return (
    <Stack gap="5">
      <Inline gap="5" wrap>
        <Switch
          size="sm"
          label="Merge and reorder rules"
          checked={options.restructure}
          onChange={(restructure) => onOptions({ restructure })}
        />
        <Switch
          size="sm"
          label="Merge media queries (can change the cascade)"
          checked={options.forceMediaMerge}
          onChange={(forceMediaMerge) => onOptions({ forceMediaMerge })}
        />
        <Switch
          size="sm"
          label="Keep licence comments"
          checked={options.keepLicenceComments}
          onChange={(keepLicenceComments) => onOptions({ keepLicenceComments })}
        />
      </Inline>
      <Text size="sm" tone="muted">
        Removes whitespace and comments, shortens colours, numbers and units,
        drops repeated and overridden declarations, merges shorthand properties
        and, with merging on, joins rules that share selectors or declarations.
      </Text>
      {job.error ? (
        <Notice tone="danger" title="Could not optimise">
          {job.error.message}
        </Notice>
      ) : null}
      {r ? (
        <>
          <Grid minItemWidth="10rem" gap="4">
            <Stat label="Original" value={formatBytes(r.before)} />
            <Stat
              label="Optimised"
              value={formatBytes(r.after)}
              delta={saving(r.before, r.after)}
            />
            <Stat label="Gzipped before" value={formatBytes(r.gzipBefore)} />
            <Stat
              label="Gzipped after"
              value={formatBytes(r.gzipAfter)}
              delta={saving(r.gzipBefore, r.gzipAfter)}
            />
          </Grid>
          <CodeBlock
            title="Optimised CSS"
            code={r.css}
            language="css"
            wrap
            copyable
            maxLines={20}
            actions={
              <Inline gap="2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={download}
                  onClick={() => onDownload(r.css)}
                >
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={wand}
                  onClick={() => onReplace(r.css)}
                >
                  Use in editor
                </Button>
              </Inline>
            }
          />
        </>
      ) : job.pending ? (
        <LoadingDots label="Optimising" />
      ) : null}
    </Stack>
  );
}
