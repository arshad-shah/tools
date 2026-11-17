import {
  CopyButton,
  EmptyState,
  Inline,
  List,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { history } from '@arshad-shah/cynosure/icons';
import React, { useMemo, useState } from 'react';
import { formatIso, listZones, localZone } from '@/shared/lib/time';
import { useNow } from '@/shared/lib/use-now';
import { nextRuns } from '../lib/next';
import type { CronAst } from '../lib/parse';

interface NextRunsProps {
  ast: CronAst | null;
  /** The zone setting; empty means the browser's zone. */
  zone: string;
  onZone(zone: string): void;
  count: number;
  onCount(count: number): void;
}

const COUNTS = ['10', '20', '50'] as const;

/**
 * The next run times in a chosen zone, as ISO 8601 with the offset, listed
 * strictly after now and refreshed as each minute turns.
 */
export const NextRuns: React.FC<NextRunsProps> = ({
  ast,
  zone,
  onZone,
  count,
  onCount,
}) => {
  // Cron runs fall on whole minutes: the list moves on as its first run passes.
  const from = useNow(60_000, { align: true });
  // Zone labels (with offsets) once per visit, not on every minute tick.
  const [zones] = useState(() => listZones(Date.now()));
  const effective = zone || localZone();
  const runs = useMemo(() => {
    if (!ast) return [];
    try {
      return nextRuns(ast, { from, count, zone: effective }).map((t) =>
        formatIso(t, effective),
      );
    } catch {
      return [];
    }
  }, [ast, from, count, effective]);

  return (
    <Stack gap="5">
      <Inline gap="4" align="end" wrap>
        <Select
          label="Time zone"
          width="md"
          value={zone}
          onChange={onZone}
          options={[
            { value: '', label: `Browser zone (${localZone()})` },
            ...zones.map((z) => ({ value: z.id, label: z.label })),
          ]}
        />
        <SegmentedControl
          label="How many runs"
          value={String(count)}
          onChange={(v) => onCount(Number(v))}
          options={COUNTS.map((c) => ({ value: c, label: c }))}
        />
        <CopyButton
          value={runs.join('\n')}
          disabled={!runs.length}
          labels={{ copy: 'Copy runs' }}
        />
      </Inline>
      {ast?.reboot ? (
        <Text size="sm" tone="muted">
          @reboot runs once at startup, so it has no scheduled times.
        </Text>
      ) : runs.length ? (
        <List
          label="Next runs"
          marker="number"
          divided
          size="sm"
          items={runs.map((r, i) => ({
            id: `${i}-${r}`,
            label: (
              <Text as="span" variant="code">
                {r}
              </Text>
            ),
          }))}
        />
      ) : (
        <EmptyState
          size="sm"
          icon={history}
          title="No runs"
          description="Fix the expression to see when it runs next."
        />
      )}
    </Stack>
  );
};
