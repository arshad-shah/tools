import React from 'react';
import { Button, ButtonGroup, Inline, Stack, Text } from '@/shared/ui';
import { adjustRegister, clearRegister, clearRegisters } from '../lib/memory';
import type { MemoryRegister } from '../settings';

interface MemoryPanelProps {
  memories: MemoryRegister[];
  onChange(memories: MemoryRegister[]): void;
  /** The active line's numeric result, or null when it has none. */
  current: number | null;
  /** Insert a register's value into the active line. */
  onRecall(text: string): void;
}

/** The M1 to M3 registers: recall, add or subtract the active result, clear. */
export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  memories,
  onChange,
  current,
  onRecall,
}) => (
  <Stack gap="2">
    {memories.map((m, i) => (
      <Inline
        key={m.label}
        justify="between"
        align="center"
        gap="2"
        wrap
        className="rounded-md border border-line px-3 py-2"
      >
        <Text size="sm" mono>
          {m.label}: {m.value === null ? 'Empty' : String(m.value)}
        </Text>
        <ButtonGroup>
          <Button
            size="sm"
            variant="secondary"
            aria-label={`Recall ${m.label}`}
            disabled={m.value === null}
            onClick={() => m.value !== null && onRecall(String(m.value))}
          >
            MR
          </Button>
          <Button
            size="sm"
            variant="secondary"
            aria-label={`Add the result to ${m.label}`}
            disabled={current === null}
            onClick={() =>
              current !== null && onChange(adjustRegister(memories, i, current))
            }
          >
            M+
          </Button>
          <Button
            size="sm"
            variant="secondary"
            aria-label={`Subtract the result from ${m.label}`}
            disabled={current === null}
            onClick={() =>
              current !== null &&
              onChange(adjustRegister(memories, i, -current))
            }
          >
            M-
          </Button>
          <Button
            size="sm"
            variant="danger"
            aria-label={`Clear ${m.label}`}
            onClick={() => onChange(clearRegister(memories, i))}
          >
            MC
          </Button>
        </ButtonGroup>
      </Inline>
    ))}
    <Inline>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onChange(clearRegisters(memories))}
      >
        Clear all registers
      </Button>
    </Inline>
  </Stack>
);
