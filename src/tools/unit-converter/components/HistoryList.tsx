import React from 'react';
import { IconHistory } from '@/shared/ui/icons';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import { convert } from '../lib/convert';
import { formatNumber } from '../lib/format';
import { findUnit, getCategory } from '../lib/units';
import type { UnitHistoryEntry } from '../settings';

export interface HistoryListProps {
  history: UnitHistoryEntry[];
  precision: number;
  locale: string;
  basePx: number;
  onUse: (entry: UnitHistoryEntry) => void;
  onClear: () => void;
}

/** Settled conversions, newest first (the last 20 persist). */
export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  precision,
  locale,
  basePx,
  onUse,
  onClear,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center">
        <Inline gap="2" align="center">
          <IconHistory size="sm" />
          <CardTitle as="h2">Recent</CardTitle>
        </Inline>
        {history.length > 0 && (
          <Button variant="secondary" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </Inline>
    </CardHeader>
    <CardBody>
      {history.length === 0 ? (
        <Text size="sm" tone="subtle">
          Conversions appear here once you stop typing.
        </Text>
      ) : (
        <Stack gap="1">
          {history.map((h) => {
            const c = getCategory(h.category, { basePx });
            const from = c && findUnit(c, h.from);
            const to = c && findUnit(c, h.to);
            if (!c || !from || !to) return null;
            const fmt = (v: number) =>
              formatNumber(v, { significant: precision, locale });
            const label = `${fmt(h.amount)} ${from.symbol} = ${fmt(convert(h.amount, from, to))} ${to.symbol}`;
            return (
              <Button
                key={`${h.at}-${h.category}-${h.from}`}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => onUse(h)}
              >
                {label}
              </Button>
            );
          })}
        </Stack>
      )}
    </CardBody>
  </Card>
);
