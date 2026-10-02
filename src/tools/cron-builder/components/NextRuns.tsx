import React, { useMemo } from 'react';
import { IconCheck, IconCopy } from '@/shared/ui/icons';
import {
  Button,
  Inline,
  Label,
  List,
  ListItem,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { formatIso, listZones, localZone } from '@/shared/lib/time';
import { nextRuns } from '../lib/next';
import type { CronAst } from '../lib/parse';

interface NextRunsProps {
  ast: CronAst | null;
  /** The zone setting; empty means the browser's zone. */
  zone: string;
  onZone(zone: string): void;
  count: number;
  onCount(count: number): void;
  /** Runs are listed strictly after this instant. */
  from: number;
}

const COUNTS = ['10', '20', '50'] as const;

/** The next run times in a chosen zone, as ISO 8601 with the offset. */
export const NextRuns: React.FC<NextRunsProps> = ({
  ast,
  zone,
  onZone,
  count,
  onCount,
  from,
}) => {
  const { copied, copy } = useClipboard();
  const zones = useMemo(() => listZones(from), [from]);
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
    <Stack gap="3">
      <Inline gap="4" align="end" wrap>
        <Stack gap="1" className="w-full sm:w-auto sm:min-w-64">
          <Label htmlFor="cron-zone">Time zone</Label>
          <Select
            id="cron-zone"
            value={zone}
            onValueChange={onZone}
            items={[
              { value: '', label: `Browser zone (${localZone()})` },
              ...zones.map((z) => ({ value: z.id, label: z.label })),
            ]}
          />
        </Stack>
        <SegmentedControl
          label="How many runs"
          value={String(count)}
          onChange={(v) => onCount(Number(v))}
          options={COUNTS.map((c) => ({ value: c, label: c }))}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!runs.length}
          leftIcon={copied ? <IconCheck size="sm" /> : <IconCopy size="sm" />}
          onClick={() => void copy(runs.join('\n'), 'runs')}
        >
          {copied ? 'Copied runs' : 'Copy runs'}
        </Button>
      </Inline>
      {ast?.reboot ? (
        <Text size="sm" tone="muted">
          @reboot runs once at startup, so it has no scheduled times.
        </Text>
      ) : runs.length ? (
        <List aria-label="Next runs" data-dynamic="">
          {runs.map((r, i) => (
            <ListItem key={`${i}-${r}`} className="font-mono text-sm">
              {r}
            </ListItem>
          ))}
        </List>
      ) : (
        <Text size="sm" tone="muted">
          None
        </Text>
      )}
    </Stack>
  );
};
