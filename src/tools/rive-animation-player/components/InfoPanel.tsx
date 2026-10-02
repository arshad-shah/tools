import { useMemo } from 'react';
import {
  Badge,
  EmptyState,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/shared/ui';
import { artboardSizes } from '../lib/animator';
import type { LoadedRive } from '../types';

const NOT_STORED = 'Not stored in this file';

interface Row {
  name: string;
  size: string;
  animations: number;
  stateMachines: number;
}

function readRows(loaded: LoadedRive): Row[] {
  const { rive } = loaded;
  const contents = rive.contents?.artboards ?? [];
  const sizes = artboardSizes(rive);
  const active = rive.activeArtboard;
  return contents.map((a) => {
    const measured = sizes?.find((s) => s.name === a.name);
    const size = measured
      ? `${Math.round(measured.width)} by ${Math.round(measured.height)}`
      : a.name === active && rive.artboardWidth > 0
        ? `${Math.round(rive.artboardWidth)} by ${Math.round(rive.artboardHeight)}`
        : 'Select to measure';
    return {
      name: a.name,
      size,
      animations: a.animations.length,
      stateMachines: a.stateMachines.length,
    };
  });
}

/** The file's real artboards (names, sizes, contents) and what it stores. */
export function InfoPanel({
  loaded,
  selectedArtboard,
  fps,
}: {
  loaded: LoadedRive | null;
  selectedArtboard: string;
  /** Frame rate of the active linear animation, when one is active. */
  fps: number | null;
}) {
  const rows = useMemo(() => (loaded ? readRows(loaded) : []), [loaded]);
  if (!loaded)
    return (
      <EmptyState
        size="sm"
        title="No file loaded"
        description="Load a Rive file to see its artboards."
      />
    );
  return (
    <Stack gap="3">
      <Text size="sm" weight="medium">
        {rows.length === 1 ? '1 artboard' : `${rows.length} artboards`}
      </Text>
      <Table aria-label="Artboards">
        <TableHeader>
          <TableRow>
            <TableHead>Artboard</TableHead>
            <TableHead>Size (px)</TableHead>
            <TableHead>Animations</TableHead>
            <TableHead>State machines</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.name}>
              <TableCell>
                {r.name}
                {r.name === selectedArtboard && (
                  <>
                    {' '}
                    <Badge size="sm" variant="soft" tone="accent">
                      Active
                    </Badge>
                  </>
                )}
              </TableCell>
              <TableCell>{r.size}</TableCell>
              <TableCell>{r.animations}</TableCell>
              <TableCell>{r.stateMachines}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Stack gap="1">
        <Text size="sm">
          Frame rate: {fps ? `${fps} fps (active animation)` : NOT_STORED}
        </Text>
        <Text size="sm">Format version: {NOT_STORED}</Text>
      </Stack>
    </Stack>
  );
}
