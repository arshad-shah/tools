import { Button, Card, ListRow, ListRows, Text } from '@arshad-shah/cynosure';
import React from 'react';
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
  <Card
    as="section"
    title="Recent"
    actions={
      history.length > 0 ? (
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      ) : undefined
    }
  >
    {history.length === 0 ? (
      <Text size="sm" tone="muted">
        Conversions appear here once you stop typing.
      </Text>
    ) : (
      <ListRows label="Recent conversions" size="sm">
        {history.map((h) => {
          const c = getCategory(h.category, { basePx });
          const from = c && findUnit(c, h.from);
          const to = c && findUnit(c, h.to);
          if (!c || !from || !to) return null;
          const fmt = (v: number) =>
            formatNumber(v, { significant: precision, locale });
          return (
            <ListRow
              key={`${h.at}-${h.category}-${h.from}`}
              label={`${fmt(h.amount)} ${from.symbol} = ${fmt(convert(h.amount, from, to))} ${to.symbol}`}
              description={c.label}
              onClick={() => onUse(h)}
            />
          );
        })}
      </ListRows>
    )}
  </Card>
);
