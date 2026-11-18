import {
  Card,
  Combobox,
  EmptyState,
  IconButton,
  Inline,
  SortableList,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { globe, plus, trash } from '@arshad-shah/cynosure/icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  formatIso,
  listZones,
  offsetText,
  zoneOffsetMinutes,
} from '@/shared/lib/time';
import { searchZones } from '../lib/zone-search';

export interface WorldClockProps {
  /** The instant shown in every zone. */
  instant: number;
  zones: string[];
  onZones: (zones: string[]) => void;
}

/**
 * The world clock: the instant in each listed zone. Zones are added from
 * one search list (ids, cities and aliases), removed, and reordered by dragging or
 * from the keyboard (SortableList).
 */
export const WorldClock: React.FC<WorldClockProps> = ({
  instant,
  zones,
  onZones,
}) => {
  const [query, setQuery] = useState('');
  const added = useRef(false);
  const all = useMemo(() => listZones(), []);
  const matches = useMemo(
    () => searchZones(query, all).filter((z) => !zones.includes(z.id)),
    [query, all, zones],
  );

  return (
    <Card as="section" title="World clock">
      <Stack gap="5">
        <Combobox
          label="Add a zone or city"
          labelHidden
          iconStart={plus}
          placeholder="Add a zone or city, such as Dublin"
          options={matches.map((z) => ({ value: z.id, label: z.label }))}
          // searchZones already matched ids, cities and aliases.
          filter={false}
          value=""
          onChange={(id) => {
            if (!id) return;
            added.current = true;
            onZones([...zones, id]);
            setQuery('');
          }}
          inputValue={query}
          onInputChange={(text) => {
            // The list fills the input with the chosen label: start afresh.
            if (added.current) {
              added.current = false;
              setQuery('');
              return;
            }
            setQuery(text);
          }}
          labels={{
            empty: query.trim()
              ? 'No other zone matches that search.'
              : 'Type a zone, city or country.',
          }}
        />
        {zones.length === 0 ? (
          <EmptyState
            size="sm"
            icon={globe}
            title="No zones yet"
            description="Add zones to compare them side by side."
          />
        ) : (
          <SortableList
            label="World clock"
            size="sm"
            items={zones.map((zone) => ({
              id: zone,
              label: zone,
              content: (
                <Inline gap="3" align="center" justify="between" wrap>
                  <Stack gap="1" minSize="0">
                    <Text weight="medium">{zone.replace(/_/g, ' ')}</Text>
                    <Text size="sm" tone="muted">
                      {`UTC${offsetText(zoneOffsetMinutes(zone, instant))}`}
                    </Text>
                  </Stack>
                  <Inline gap="2" align="center">
                    <Text variant="code">
                      {formatIso(instant, zone).slice(0, 19).replace('T', ' ')}
                    </Text>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      tone="neutral"
                      icon={trash}
                      label={`Remove ${zone}`}
                      onClick={() => onZones(zones.filter((z) => z !== zone))}
                    />
                  </Inline>
                </Inline>
              ),
            }))}
            onReorder={(items) => onZones(items.map((i) => i.id))}
          />
        )}
      </Stack>
    </Card>
  );
};
