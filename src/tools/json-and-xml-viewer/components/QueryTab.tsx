import { useRef, useState } from 'react';
import { textWorker } from '@/shared/workers/text-client';
import { IconPlay } from '@/shared/ui/icons';
import {
  Alert,
  Button,
  CodeSurface,
  CopyButton,
  Inline,
  Select,
  Stack,
  Text,
  VirtualList,
} from '@/shared/ui';
import { runQueryOffThread, type QueryOutcome } from '../lib/query';
import { pushHistory, viewerSettings } from '../settings';

export interface QueryTabProps {
  value: unknown;
  xml: Document | null;
  onSelect(id: string): void;
}

const ROW_H = 44;

/** The Query tab (spec §7.2): JSONPath for JSON and YAML, XPath for XML. */
export function QueryTab({ value, xml, onSelect }: QueryTabProps) {
  const [settings, update] = viewerSettings.useSettings();
  const [expr, setExpr] = useState(xml ? '//*' : '$..*');
  const [outcome, setOutcome] = useState<QueryOutcome | null>(null);
  const language = xml ? 'XPath' : 'JSONPath';
  const seq = useRef(0);

  // JSONPath runs on the text worker; only the latest run's result shows.
  const run = (e = expr) => {
    if (!e.trim()) return;
    const mine = ++seq.current;
    void runQueryOffThread(e, { value, xml }, textWorker).then((result) => {
      if (mine !== seq.current) return;
      setOutcome(result);
      if (result.ok)
        update({
          queryHistory: pushHistory(
            viewerSettings.getSettings().queryHistory,
            e,
          ),
        });
    });
  };

  const rows = outcome?.ok ? outcome.rows : [];
  return (
    <Stack gap="2" className="h-full min-h-0">
      <Inline gap="2" align="start">
        <CodeSurface
          className="min-w-0 flex-1"
          singleLine
          language="plain"
          label={`${language} query`}
          value={expr}
          onChange={setExpr}
          onSubmit={() => run()}
          placeholder={xml ? '//book/@id' : '$.store.book[*].author'}
        />
        <Button
          size="md"
          variant="primary"
          leftIcon={<IconPlay size="sm" />}
          onClick={() => run()}
        >
          Run
        </Button>
      </Inline>
      {settings.queryHistory.length ? (
        <Select
          aria-label="Recent queries"
          value=""
          onValueChange={(v) => {
            if (!v) return;
            setExpr(v);
            run(v);
          }}
          items={[
            { value: '', label: 'Recent queries' },
            ...settings.queryHistory.map((h) => ({ value: h, label: h })),
          ]}
        />
      ) : null}
      {outcome && !outcome.ok ? (
        <Alert status="danger" size="sm">
          {outcome.error.message}
        </Alert>
      ) : null}
      {outcome?.ok ? (
        <Inline justify="between">
          <Text size="sm" tone="muted" aria-live="polite">
            {`${rows.length.toLocaleString('en-US')} ${rows.length === 1 ? 'result' : 'results'}`}
          </Text>
          <CopyButton
            variant="text"
            label="results as JSON"
            disabled={!rows.length}
            value={() =>
              JSON.stringify(
                rows.map((r) => ({ path: r.path, value: r.value })),
                null,
                2,
              )
            }
          />
        </Inline>
      ) : null}
      {rows.length ? (
        <VirtualList
          className="min-h-0 flex-1 rounded-md border border-line"
          height="100%"
          items={rows}
          estimateSize={ROW_H}
          focusModel="none"
          ariaLabel="Query results"
          getKey={(_r, i) => i}
          renderItem={(r) => (
            <Button
              variant="ghost"
              className="h-11 w-full flex-col items-start justify-center gap-0 rounded-none px-3 text-left font-mono"
              disabled={!r.id}
              onClick={() => onSelect(r.id)}
            >
              <span className="w-full truncate text-xs text-fg-muted">
                {r.path}
              </span>
              <span className="w-full truncate text-sm text-fg">
                {r.preview}
              </span>
            </Button>
          )}
        />
      ) : null}
    </Stack>
  );
}
