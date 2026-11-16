import {
  Button,
  CopyButton,
  Grid,
  IconButton,
  Inline,
  Notice,
  NumberField,
  ProgressBar,
  Select,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { dice, refreshCw } from '@arshad-shah/cynosure/icons';
import type React from 'react';
import {
  MOCK_LOCALES,
  type MockLocale,
} from '@/shared/lib/data-formats/mock-schema';
import { formatBytes } from '@/shared/lib/format';
import type { JobProgress } from '@/shared/state/useJob';
import { MAX_COUNT, WARN_COUNT } from '../lib/engine';
import { LOCALE_LABEL } from '../lib/locales';
import { memoryEstimate, newSeed } from '../lib/seed';

interface GeneratePanelProps {
  /** The preset picker, first in the row. */
  preset?: React.ReactNode;
  count: number;
  onCount(n: number): void;
  seed: string;
  onSeed(s: string): void;
  locale: MockLocale;
  onLocale(l: MockLocale): void;
  fieldCount: number;
  running: boolean;
  progress: JobProgress | null;
  onGenerate(): void;
  onCancel(): void;
}

/** Row count (capped, with a memory warning), seed, locale and Generate. */
export function GeneratePanel(p: GeneratePanelProps) {
  const over = p.count > MAX_COUNT;
  return (
    <Stack gap="3">
      <Grid columns={{ base: 1, sm: 2, lg: 4 }} gap="3">
        {p.preset}
        <NumberField
          label="Rows"
          value={p.count}
          min={1}
          onChange={(v) => v !== null && p.onCount(Math.max(1, Math.round(v)))}
        />
        <TextField
          label="Seed"
          value={p.seed}
          onChange={p.onSeed}
          placeholder="Random every time"
          addonEnd={
            <Inline gap="0" wrap={false}>
              <IconButton
                size="sm"
                variant="ghost"
                label="New seed"
                icon={dice}
                onClick={() => p.onSeed(newSeed())}
              />
              <CopyButton
                size="sm"
                variant="ghost"
                value={p.seed}
                disabled={!p.seed}
                labels={{ copy: 'Copy seed', copied: 'Copied' }}
              />
            </Inline>
          }
        />
        <Select
          label="Locale"
          value={p.locale}
          onChange={(v) => p.onLocale(v as MockLocale)}
          options={MOCK_LOCALES.map((l) => ({
            value: l,
            label: LOCALE_LABEL[l],
          }))}
        />
      </Grid>
      <Text size="xs" tone="muted">
        {p.seed
          ? 'Seeded: the same schema, seed and row count give the same data. Deterministic, not for security.'
          : 'No seed: values come from the browser secure random source.'}
      </Text>
      {over ? (
        <Notice tone="danger">
          {`At most ${MAX_COUNT.toLocaleString('en-US')} rows per table.`}
        </Notice>
      ) : (
        p.count > WARN_COUNT && (
          <Notice tone="warning">
            {`Large output: about ${formatBytes(memoryEstimate(p.count, p.fieldCount))} in memory. The preview shows the first 1,000 rows.`}
          </Notice>
        )
      )}
      <Inline gap="3" align="center" wrap>
        <Button
          variant="solid"
          icon={refreshCw}
          onClick={p.onGenerate}
          disabled={over || p.running}
          aria-keyshortcuts="Control+Enter"
        >
          Generate
        </Button>
        {p.running && (
          <>
            {p.progress && (
              <ProgressBar
                label="Generation progress"
                labelHidden
                value={p.progress.done}
                max={p.progress.total}
              />
            )}
            <Text size="sm" tone="muted" numeric>
              {p.progress
                ? `${p.progress.done.toLocaleString('en-US')} of ${p.progress.total.toLocaleString('en-US')} rows`
                : 'Starting'}
            </Text>
            <Button size="sm" variant="ghost" onClick={p.onCancel}>
              Cancel
            </Button>
          </>
        )}
      </Inline>
    </Stack>
  );
}
