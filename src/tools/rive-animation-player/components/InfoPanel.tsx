import { useMemo } from 'react';
import {
  Badge,
  DescriptionList,
  EmptyState,
  Inline,
  Stack,
  Table,
  Text,
} from '@arshad-shah/cynosure';
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
    <Stack gap="4">
      <Table<Row>
        caption="Artboards"
        size="sm"
        rows={rows}
        getRowId={(r) => r.name}
        columns={[
          {
            key: 'name',
            header: 'Artboard',
            rowHeader: true,
            cell: (r) => (
              <Inline gap="2" align="center" wrap>
                <Text size="sm">{r.name}</Text>
                {r.name === selectedArtboard ? (
                  <Badge tone="accent" size="sm">
                    Active
                  </Badge>
                ) : null}
              </Inline>
            ),
          },
          { key: 'size', header: 'Size (px)', cell: (r) => r.size },
          {
            key: 'animations',
            header: 'Animations',
            align: 'end',
            cell: (r) => r.animations,
          },
          {
            key: 'stateMachines',
            header: 'State machines',
            align: 'end',
            cell: (r) => r.stateMachines,
          },
        ]}
      />
      <Text size="sm" tone="muted">
        {rows.length === 1 ? '1 artboard' : `${rows.length} artboards`}
      </Text>
      <DescriptionList
        size="sm"
        layout="inline"
        items={[
          {
            id: 'fps',
            term: 'Frame rate',
            detail: fps ? `${fps} fps (active animation)` : NOT_STORED,
          },
          { id: 'version', term: 'Format version', detail: NOT_STORED },
        ]}
      />
    </Stack>
  );
}
