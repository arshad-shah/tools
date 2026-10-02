import React, { useMemo, useState } from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTrash2,
} from '@/shared/ui/icons';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  EmptyState,
  IconButton,
  Inline,
  SearchInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/shared/ui';
import {
  formatIso,
  listZones,
  offsetText,
  zoneOffsetMinutes,
} from '@/shared/lib/time';
import { moveItem, searchZones } from '../lib/zone-search';

export interface WorldClockProps {
  /** The instant shown in every zone. */
  instant: number;
  zones: string[];
  onZones: (zones: string[]) => void;
}

/**
 * The world clock (spec §9.6): the instant in each listed zone. Zones are
 * added by search (ids, cities and aliases), removed, and reordered with
 * the buttons or Alt+Up and Alt+Down on a row.
 */
export const WorldClock: React.FC<WorldClockProps> = ({
  instant,
  zones,
  onZones,
}) => {
  const [query, setQuery] = useState('');
  const [moved, setMoved] = useState('');
  const all = useMemo(() => listZones(), []);
  const matches = useMemo(
    () => searchZones(query, all).filter((z) => !zones.includes(z.id)),
    [query, all, zones],
  );

  const move = (i: number, delta: number) => {
    const next = moveItem(zones, i, delta);
    if (next === zones) return;
    onZones(next);
    setMoved(
      `${zones[i]} moved to position ${i + delta + 1} of ${zones.length}`,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">World clock</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Add a zone or city, such as Dublin"
            aria-label="Add a zone or city"
          />
          {matches.length > 0 && (
            <Inline gap="2" wrap>
              {matches.map((z) => (
                <Button
                  key={z.id}
                  variant="secondary"
                  size="sm"
                  leftIcon={<IconPlus size="sm" />}
                  onClick={() => {
                    onZones([...zones, z.id]);
                    setQuery('');
                  }}
                >
                  {z.label}
                </Button>
              ))}
            </Inline>
          )}
          {query.trim() && matches.length === 0 && (
            <EmptyState
              size="sm"
              title="No matches"
              description="No other zone matches that search."
            />
          )}
          {zones.length === 0 ? (
            <EmptyState
              size="sm"
              title="No zones yet"
              description="Add zones to compare them side by side."
            />
          ) : (
            <Table aria-label="World clock">
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Time there</TableHead>
                  <TableHead>Offset</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone, i) => (
                  <TableRow
                    key={zone}
                    tabIndex={0}
                    aria-label={zone}
                    onKeyDown={(e) => {
                      if (!e.altKey || e.target !== e.currentTarget) return;
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        move(i, e.key === 'ArrowUp' ? -1 : 1);
                      }
                    }}
                  >
                    <TableCell>{zone.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <Code>
                        {formatIso(instant, zone)
                          .slice(0, 19)
                          .replace('T', ' ')}
                      </Code>
                    </TableCell>
                    <TableCell>
                      UTC{offsetText(zoneOffsetMinutes(zone, instant))}
                    </TableCell>
                    <TableCell>
                      <Inline gap="1" wrap={false}>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          label={`Move ${zone} up`}
                          icon={<IconArrowUp size="sm" />}
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                        />
                        <IconButton
                          variant="ghost"
                          size="sm"
                          label={`Move ${zone} down`}
                          icon={<IconArrowDown size="sm" />}
                          disabled={i === zones.length - 1}
                          onClick={() => move(i, 1)}
                        />
                        <IconButton
                          variant="ghost"
                          size="sm"
                          label={`Remove ${zone}`}
                          icon={<IconTrash2 size="sm" />}
                          onClick={() =>
                            onZones(zones.filter((z) => z !== zone))
                          }
                        />
                      </Inline>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Text size="xs" tone="subtle" aria-live="polite" className="sr-only">
            {moved}
          </Text>
        </Stack>
      </CardBody>
    </Card>
  );
};
