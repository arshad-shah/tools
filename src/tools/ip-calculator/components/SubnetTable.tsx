import { CopyButton, Inline, Table, Text } from '@arshad-shah/cynosure';
import type { TableColumn } from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import { formatNetwork, type Network } from '../lib/cidr';
import { subnetInfo, type SubnetInfo } from '../lib/subnet';
import { count } from '../lib/format';

export interface SubnetRow {
  id: string;
  /** A name (VLSM) or the subnet's number. */
  name: string;
  /** Extra text after the name, such as the hosts asked for. */
  detail?: string;
  network: Network;
}

interface Row extends SubnetRow {
  info: SubnetInfo;
  cidr: string;
}

const code = (s: string) => (
  <Text as="span" variant="code" wrap="pre">
    {s}
  </Text>
);

/** Subnets as a table: CIDR, usable range, last address and host count. */
export function SubnetTable({
  rows,
  caption,
  nameHeader = '#',
}: {
  rows: SubnetRow[];
  caption: string;
  nameHeader?: string;
}) {
  const data = useMemo<Row[]>(
    () =>
      rows.map((r) => ({
        ...r,
        info: subnetInfo(r.network),
        cidr: formatNetwork(r.network),
      })),
    [rows],
  );
  const v4 = rows[0]?.network.version !== 6;
  const columns: TableColumn<Row>[] = [
    {
      key: 'name',
      header: nameHeader,
      rowHeader: true,
      cell: (r) =>
        r.detail ? (
          <Inline gap="2" wrap as="span">
            <Text as="span">{r.name}</Text>
            <Text as="span" size="sm" tone="muted">
              {r.detail}
            </Text>
          </Inline>
        ) : (
          r.name
        ),
    },
    { key: 'cidr', header: 'Network', cell: (r) => code(r.cidr) },
    {
      key: 'range',
      header: 'Usable range',
      cell: (r) => code(`${r.info.firstUsable} to ${r.info.lastUsable}`),
    },
    {
      key: 'last',
      header: v4 ? 'Broadcast' : 'Last address',
      cell: (r) => code(r.info.broadcast ?? r.info.last),
    },
    {
      key: 'hosts',
      header: 'Usable hosts',
      align: 'end',
      cell: (r) => count(r.info.usable),
    },
  ];
  return (
    <Table
      caption={caption}
      captionHidden
      size="sm"
      stickyHeader
      columns={columns}
      rows={data}
      getRowId={(r) => r.id}
    />
  );
}

/** Copies the CIDRs, one per line. */
export function CopyCidrs({
  networks,
  label,
}: {
  networks: Network[];
  label: string;
}) {
  return (
    <CopyButton
      size="sm"
      variant="soft"
      value={() => networks.map(formatNetwork).join('\n')}
      labels={{ copy: label }}
    />
  );
}
