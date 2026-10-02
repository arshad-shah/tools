import { useId } from 'react';
import {
  MOCK_LOCALES,
  type MockLocale,
} from '@/shared/lib/data-formats/mock-schema';
import { formatBytes } from '@/shared/lib/format';
import type { JobProgress } from '@/shared/state/useJob';
import {
  Alert,
  AlertDescription,
  Button,
  CopyButton,
  Grid,
  IconButton,
  Inline,
  Input,
  Label,
  NumberInput,
  Progress,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import { IconDice1, IconRefreshCw } from '@/shared/ui/icons';
import { MAX_COUNT, WARN_COUNT } from '../lib/engine';
import { LOCALE_LABEL } from '../lib/locales';
import { memoryEstimate, newSeed } from '../lib/seed';

interface GeneratePanelProps {
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
  const ids = { count: useId(), seed: useId(), locale: useId() };
  const over = p.count > MAX_COUNT;
  return (
    <Stack gap="3">
      <Grid max={3} gap="3">
        <Stack gap="1">
          <Label htmlFor={ids.count}>Rows</Label>
          <NumberInput
            id={ids.count}
            value={p.count}
            min={1}
            max={MAX_COUNT}
            onValueChange={(v) => p.onCount(Math.max(1, Math.round(v)))}
          />
        </Stack>
        <Stack gap="1">
          <Label htmlFor={ids.seed}>Seed</Label>
          <Inline gap="1" align="center" wrap={false}>
            <Input
              id={ids.seed}
              value={p.seed}
              onChange={p.onSeed}
              placeholder="Random every time"
            />
            <IconButton
              size="sm"
              variant="ghost"
              label="New seed"
              icon={IconDice1}
              onClick={() => p.onSeed(newSeed())}
            />
            <CopyButton label="seed" value={p.seed} />
          </Inline>
        </Stack>
        <Stack gap="1">
          <Label htmlFor={ids.locale}>Locale</Label>
          <Select
            id={ids.locale}
            value={p.locale}
            onValueChange={(v) => p.onLocale(v as MockLocale)}
            items={MOCK_LOCALES.map((l) => ({
              value: l,
              label: LOCALE_LABEL[l],
            }))}
          />
        </Stack>
      </Grid>
      <Text size="xs" tone="subtle">
        {p.seed
          ? 'Seeded: the same schema, seed and row count give the same data. Deterministic, not for security.'
          : 'No seed: values come from the browser secure random source.'}
      </Text>
      {over ? (
        <Alert status="danger" size="sm">
          <AlertDescription>
            {`At most ${MAX_COUNT.toLocaleString('en-US')} rows per table.`}
          </AlertDescription>
        </Alert>
      ) : (
        p.count > WARN_COUNT && (
          <Alert status="warning" size="sm">
            <AlertDescription>
              {`Large output: about ${formatBytes(memoryEstimate(p.count, p.fieldCount))} in memory. The preview shows the first 1,000 rows.`}
            </AlertDescription>
          </Alert>
        )
      )}
      <Inline gap="3" align="center" wrap>
        <Button
          variant="primary"
          leftIcon={<IconRefreshCw size="sm" />}
          onClick={p.onGenerate}
          disabled={over || p.running}
          aria-keyshortcuts="Control+Enter"
        >
          Generate
        </Button>
        {p.running && (
          <>
            {p.progress && (
              <Progress
                className="w-48"
                value={p.progress.done}
                max={p.progress.total}
                label="Generation progress"
              />
            )}
            <Text size="sm" tone="subtle">
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
