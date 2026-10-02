import { useMemo, useState } from 'react';
import {
  Button,
  CodeTree,
  collapseAll,
  expandAll,
  expandToDepth,
  Text,
  VirtualList,
  type TreeNodeData,
} from '@/shared/ui';
import type { TokenKind } from '@/shared/lib/syntax/types';
import { Row, Section } from '../Section';
import { seeded } from '../demo-data';

const LEVELS = ['INFO', 'INFO', 'INFO', 'DEBUG', 'WARN', 'ERROR'] as const;
const MESSAGES = [
  'GET /api/orders 200 in 18 ms',
  'cache hit for user profile 4417',
  'POST /api/checkout 201 in 64 ms',
  'retrying payment webhook, attempt 2',
  'slow query on invoices took 812 ms',
  'connection pool resized to 24',
];

interface LogLine {
  id: number;
  time: string;
  level: (typeof LEVELS)[number];
  text: string;
}

/** 20,000 log lines over five hours; a sticky header opens each hour. */
function buildLog(): { lines: LogLine[]; hours: number[] } {
  const rand = seeded(17);
  const lines: LogLine[] = [];
  const hours: number[] = [];
  for (let i = 0; i < 20_000; i++) {
    const secs = Math.floor((i / 20_000) * 5 * 3600);
    const h = 9 + Math.floor(secs / 3600);
    if (secs % 3600 < (5 * 3600) / 20_000) hours.push(i);
    const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    lines.push({
      id: i,
      time: `${String(h).padStart(2, '0')}:${mm}:${ss}`,
      level: LEVELS[Math.floor(rand() * LEVELS.length)],
      text: MESSAGES[Math.floor(rand() * MESSAGES.length)],
    });
  }
  return { lines, hours };
}

const LEVEL_CLASS: Record<LogLine['level'], string> = {
  INFO: 'text-fg-muted',
  DEBUG: 'text-fg-subtle',
  WARN: 'text-warning',
  ERROR: 'text-danger',
};

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const SAMPLE: Json = {
  id: 'ord_20260914_0042',
  status: 'shipped',
  total: 129.95,
  paid: true,
  coupon: null,
  customer: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    address: { city: 'London', postcode: 'NW1 6XE', country: 'GB' },
  },
  items: [
    { sku: 'KB-104', title: 'Mechanical keyboard', qty: 1, price: 89.0 },
    { sku: 'MS-221', title: 'Wireless mouse', qty: 1, price: 34.95 },
    { sku: 'CB-007', title: 'USB-C cable', qty: 2, price: 3.0 },
  ],
  tags: ['priority', 'gift'],
};

function valueOf(v: Json): { text: string; kind: TokenKind } | undefined {
  if (v === null) return { text: 'null', kind: 'null' };
  if (typeof v === 'string') return { text: `"${v}"`, kind: 'string' };
  if (typeof v === 'number') return { text: String(v), kind: 'number' };
  if (typeof v === 'boolean') return { text: String(v), kind: 'boolean' };
  return undefined;
}

/** A JSON value as CodeTree nodes (children built lazily, then cached). */
function toNode(
  id: string,
  label: string,
  v: Json,
  quote = true,
): TreeNodeData {
  if (v === null || typeof v !== 'object')
    return { id, label, value: valueOf(v), childCount: 0 };
  const entries: [string, Json][] = Array.isArray(v)
    ? v.map((x, i) => [String(i), x])
    : Object.entries(v);
  return {
    id,
    label,
    summary: Array.isArray(v) ? `[${v.length}]` : `{${entries.length}}`,
    childCount: entries.length,
    children: () =>
      entries.map(([k, x]) =>
        toNode(
          `${id}.${k}`,
          Array.isArray(v) || !quote ? k : `"${k}"`,
          x,
          quote,
        ),
      ),
  };
}

export function ListsTreesSection() {
  const log = useMemo(() => buildLog(), []);
  const sticky = useMemo(
    () =>
      log.hours.map((index) => ({
        index,
        render: () => (
          <div className="border-b border-line bg-surface-2 px-3 py-1 text-xs font-medium text-fg-muted">
            {`${log.lines[index].time.slice(0, 2)}:00 to ${log.lines[index].time.slice(0, 2)}:59`}
          </div>
        ),
      })),
    [log],
  );
  const roots = useMemo(() => [toNode('root', 'order', SAMPLE)], []);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() =>
    expandToDepth(roots, 2),
  );
  const [selected, setSelected] = useState<string | null>(
    'root.customer.email',
  );
  const smallRoots = useMemo(
    () => [
      toNode(
        'cfg',
        'package.json',
        {
          name: 'tools',
          private: true,
          scripts: { dev: 'vite', build: 'vite build' },
        },
        false,
      ),
    ],
    [],
  );
  const [smallExpanded, setSmallExpanded] = useState<ReadonlySet<string>>(() =>
    expandAll(smallRoots),
  );

  return (
    <Section name="lists" title="Virtual lists and trees">
      <Row label="VirtualList: 20,000 log lines, sticky hour headers">
        <VirtualList
          items={log.lines}
          estimateSize={24}
          getKey={(l) => l.id}
          ariaLabel="Server log"
          stickyHeaders={sticky}
          height={240}
          className="w-full max-w-2xl rounded-md border border-line bg-surface"
          renderItem={(l, _i, state) => (
            <div
              className={
                state.active
                  ? 'flex h-6 items-center gap-3 bg-surface-2 px-3 font-mono text-xs'
                  : 'flex h-6 items-center gap-3 px-3 font-mono text-xs'
              }
            >
              <span className="text-fg-subtle">{l.time}</span>
              <span className={`w-12 ${LEVEL_CLASS[l.level]}`}>{l.level}</span>
              <span className="truncate text-fg">{l.text}</span>
            </div>
          )}
        />
      </Row>
      <Row label="VirtualList: empty">
        <div className="w-full max-w-2xl">
          <VirtualList
            items={[] as string[]}
            estimateSize={24}
            getKey={(s) => s}
            ariaLabel="Empty log"
            height={48}
            className="rounded-md border border-line bg-surface"
            renderItem={(s) => s}
          />
          <Text size="xs" tone="muted">
            No lines match the filter.
          </Text>
        </div>
      </Row>
      <Row label="CodeTree: expandToDepth(2), selection, expandAll, collapseAll">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setExpanded(expandAll(roots))}
            >
              Expand all
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setExpanded(expandToDepth(roots, 2))}
            >
              Depth 2
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setExpanded(collapseAll())}
            >
              Collapse all
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 [&>*]:min-w-0 md:grid-cols-2">
            <CodeTree
              roots={roots}
              expanded={expanded}
              onExpandedChange={setExpanded}
              selectedId={selected}
              onSelect={setSelected}
              search={{
                ids: new Set(['root.status', 'root.items']),
                activeId: 'root.status',
              }}
              ariaLabel="Order JSON"
              height={460}
              className="rounded-md border border-line bg-surface"
            />
            <CodeTree
              roots={smallRoots}
              expanded={smallExpanded}
              onExpandedChange={setSmallExpanded}
              rowStyle="plain"
              ariaLabel="Package settings"
              height={460}
              className="rounded-md border border-line bg-surface"
            />
          </div>
        </div>
      </Row>
    </Section>
  );
}
