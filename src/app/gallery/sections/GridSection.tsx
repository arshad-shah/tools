import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  applyFilters,
  DataGrid,
  type GridColumn,
  type GridFilters,
  type SortKey,
} from '@/shared/ui';
import { Row, Section } from '../Section';
import { dayOf, isoDay, seeded } from '../demo-data';

interface Order {
  id: string;
  customer: string;
  country: string;
  placed: Date;
  items: number;
  total: number;
  paid: boolean;
  note: string;
}

const NAMES = [
  'Ada Lovelace',
  'Grace Hopper',
  'Alan Turing',
  'Katherine Johnson',
  'Edsger Dijkstra',
  'Barbara Liskov',
  'Donald Knuth',
  'Margaret Hamilton',
];
const COUNTRIES = ['GB', 'US', 'NL', 'DE', 'FR', 'JP', 'BR', 'IN'];
const NOTES = ['', '', 'Leave at the door', 'Gift wrap', '', 'Call first'];

function buildOrders(): Order[] {
  const rand = seeded(42);
  return Array.from({ length: 2_000 }, (_, i) => ({
    id: `ORD-${String(10_001 + i)}`,
    customer: NAMES[Math.floor(rand() * NAMES.length)],
    country: COUNTRIES[Math.floor(rand() * COUNTRIES.length)],
    placed: dayOf(Math.floor(rand() * 270)),
    items: 1 + Math.floor(rand() * 6),
    total: Math.round((8 + rand() * 420) * 100) / 100,
    paid: rand() > 0.2,
    note: NOTES[Math.floor(rand() * NOTES.length)],
  }));
}

const COLUMNS: GridColumn<Order>[] = [
  {
    id: 'id',
    header: 'Order',
    accessor: (r) => r.id,
    pinned: 'start',
    width: 120,
  },
  {
    id: 'customer',
    header: 'Customer',
    accessor: (r) => r.customer,
    width: 180,
  },
  { id: 'country', header: 'Country', accessor: (r) => r.country, width: 140 },
  {
    id: 'placed',
    header: 'Placed',
    accessor: (r) => isoDay(r.placed),
    type: 'date',
    width: 170,
  },
  {
    id: 'items',
    header: 'Items',
    accessor: (r) => r.items,
    type: 'number',
    width: 130,
  },
  {
    id: 'total',
    header: 'Total',
    accessor: (r) => r.total,
    type: 'number',
    width: 140,
  },
  {
    id: 'paid',
    header: 'Paid',
    accessor: (r) => r.paid,
    type: 'boolean',
    width: 130,
  },
  { id: 'note', header: 'Note', accessor: (r) => r.note, width: 200 },
];

const BAD_FILTERS: GridFilters = {
  customer: { kind: 'text', value: '(Ada', regex: true },
};

export function GridSection() {
  const orders = useMemo(() => buildOrders(), []);
  const [sort, setSort] = useState<SortKey[]>([{ id: 'total', dir: 'desc' }]);
  const [filters, setFilters] = useState<GridFilters>({
    country: { kind: 'set', values: ['GB', 'NL', 'US'] },
    paid: { kind: 'set', values: ['true'] },
  });
  const filtered = useMemo(
    () => applyFilters(orders, COLUMNS, filters),
    [orders, filters],
  );
  const bad = useMemo(
    () => applyFilters(orders, COLUMNS, BAD_FILTERS),
    [orders],
  );

  return (
    <Section name="grid" title="Data grid">
      <Row
        label={`DataGrid: 2,000 orders, filtered to ${filtered.rows.length}, sorted by total, pinned Order, search "Turing"`}
      >
        <DataGrid
          rows={filtered.rows}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          ariaLabel="Orders"
          sort={sort}
          onSortChange={setSort}
          filters={filters}
          onFiltersChange={setFilters}
          search="Turing"
          selection="cell-range"
          renderDetails={(r) => (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-fg-muted">Customer</dt>
              <dd>{r.customer}</dd>
              <dt className="text-fg-muted">Placed</dt>
              <dd>{isoDay(r.placed)}</dd>
            </dl>
          )}
          height={320}
          className="w-full"
        />
      </Row>
      <Row label="applyFilters error: invalid regex on Customer">
        <div className="flex w-full flex-col gap-2">
          <Alert status="danger">
            <AlertDescription>
              {`Customer filter: ${bad.errors.customer ?? 'no error'}`}
            </AlertDescription>
          </Alert>
        </div>
      </Row>
      <Row label="DataGrid: empty">
        <DataGrid
          rows={[] as Order[]}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          ariaLabel="Orders with no match"
          emptyLabel="No orders match these filters"
          height={140}
          className="w-full"
        />
      </Row>
    </Section>
  );
}
