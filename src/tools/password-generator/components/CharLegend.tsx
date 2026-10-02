import React from 'react';
import { Inline, Text } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { CHAR_CLASS } from '../lib/strength';
import type { CharType } from '../types';

export const CharLegend: React.FC = () => (
  <Inline gap="3" wrap>
    {(
      [
        ['uppercase', 'Aa', 'Upper'],
        ['lowercase', 'ab', 'Lower'],
        ['number', '09', 'Number'],
        ['special', '!@', 'Special'],
      ] as Array<[CharType, string, string]>
    ).map(([type, sample, label]) => (
      <Inline key={type} gap="1" align="center">
        <span className={cn('font-mono text-sm font-bold', CHAR_CLASS[type])}>
          {sample}
        </span>
        <Text as="span" size="xs" tone="subtle">
          {label}
        </Text>
      </Inline>
    ))}
  </Inline>
);
