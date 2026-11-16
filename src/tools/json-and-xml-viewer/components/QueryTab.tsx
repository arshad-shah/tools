import { useRef, useState } from 'react';
import { textWorker } from '@/shared/workers/text-client';
import {
  Button,
  CopyButton,
  Inline,
  Notice,
  Select,
  Stack,
  Text,
  VirtualList,
} from '@arshad-shah/cynosure';
import { play } from '@arshad-shah/cynosure/icons';

import { runQueryOffThread, type QueryOutcome } from '../lib/query';
import { pushHistory, viewerSettings } from '../settings';
import { CodeEditor } from '@/shared/editor';

export interface QueryTabProps {
  value: unknown;
  xml: Document | null;
  onSelect(id: string): void;
}

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
    <Stack gap="3" fill minSize="0">
      <Inline gap="2" align="start" wrap={false}>
        <Stack grow minSize="0">
          <CodeEditor
            singleLine
            language="plain"
            aria-label={`${language} query`}
            value={expr}
            onChange={setExpr}
            onSubmit={() => run()}
            placeholder={xml ? '//book/@id' : '$.store.book[*].author'}
          />
        </Stack>
        <Button variant="solid" icon={play} onClick={() => run()}>
          Run
        </Button>
      </Inline>
      {settings.queryHistory.length ? (
        <Inline>
          <Select
            label="Recent queries"
            labelHidden
            size="sm"
            placeholder="Recent queries"
            value=""
            onChange={(v) => {
              if (!v) return;
              setExpr(v);
              run(v);
            }}
            options={settings.queryHistory.map((h) => ({ value: h, label: h }))}
          />
        </Inline>
      ) : null}
      {outcome && !outcome.ok ? (
        <Notice tone="danger">{outcome.error.message}</Notice>
      ) : null}
      {outcome?.ok ? (
        <Inline gap="2" align="center" justify="between">
          <Text size="sm" tone="muted" numeric>
            <span aria-live="polite">{`${rows.length.toLocaleString('en-US')} ${rows.length === 1 ? 'result' : 'results'}`}</span>
          </Text>
          <CopyButton
            size="sm"
            variant="ghost"
            labels={{ copy: 'Copy results as JSON', copied: 'Copied' }}
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
        <Stack grow minSize="0">
          <VirtualList
            label="Query results"
            items={rows}
            getKey={(r, i) => `${i}:${r.path}`}
            selectionMode="none"
            isDisabled={(r) => !r.id}
            onAction={(r) => r.id && onSelect(r.id)}
            className="h-full"
            renderItem={(r) => (
              <Stack gap="0">
                <Text variant="code" size="xs" tone="muted" truncate>
                  {r.path}
                </Text>
                <Text variant="code" size="sm" truncate>
                  {r.preview}
                </Text>
              </Stack>
            )}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
