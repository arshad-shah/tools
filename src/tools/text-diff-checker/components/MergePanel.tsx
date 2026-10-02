import { useMemo, useState } from 'react';
import {
  Button,
  Inline,
  SegmentedControl,
  Stack,
  Text,
  TextInputPanel,
} from '@/shared/ui';
import type { DiffResult, Hunk } from '../lib/engine';
import { applyChoices, type HunkChoice } from '../lib/merge';

const span = (lines: number[]) =>
  lines.length === 0
    ? 'none'
    : lines.length === 1
      ? `line ${lines[0]}`
      : `lines ${lines[0]} to ${lines[lines.length - 1]}`;

const describeHunk = (h: Hunk) =>
  `left ${span(h.leftLines)}, right ${span(h.rightLines)}`;

interface MergePanelProps {
  result: DiffResult;
  texts: { left: string; right: string };
}

/** Per-change "Take left" or "Take right" and the merged text (spec §8.1). */
export function MergePanel({ result, texts }: MergePanelProps) {
  const [choices, setChoices] = useState<Map<number, HunkChoice>>(new Map());
  const changes = useMemo(
    () =>
      result.hunks
        .map((h, index) => ({ h, index }))
        .filter((x) => x.h.kind !== 'equal'),
    [result],
  );
  const merged = useMemo(
    () => applyChoices(result, texts, choices),
    [result, texts, choices],
  );
  const choose = (index: number, c: HunkChoice) =>
    setChoices((prev) => new Map(prev).set(index, c));
  const all = (c: HunkChoice) =>
    setChoices(new Map(changes.map((x) => [x.index, c])));

  return (
    <Stack gap="3">
      <Inline gap="2">
        <Button size="sm" variant="secondary" onClick={() => all('left')}>
          Take all left
        </Button>
        <Button size="sm" variant="secondary" onClick={() => all('right')}>
          Take all right
        </Button>
      </Inline>
      <Stack gap="2">
        {changes.map(({ h, index }, n) => (
          <Inline key={index} gap="3" className="flex-wrap">
            <Text size="sm" className="min-w-48">
              Change {n + 1}: {describeHunk(h)}
            </Text>
            <SegmentedControl
              size="sm"
              label={`Change ${n + 1} source`}
              value={choices.get(index) ?? 'left'}
              onChange={(v) => choose(index, v)}
              options={[
                { value: 'left', label: 'Take left' },
                { value: 'right', label: 'Take right' },
              ]}
            />
          </Inline>
        ))}
      </Stack>
      <TextInputPanel
        label="Merged result"
        value={merged}
        onChange={() => {}}
        language="plain"
        readOnly
        downloadName="merged.txt"
        maxHeight={320}
      />
    </Stack>
  );
}
