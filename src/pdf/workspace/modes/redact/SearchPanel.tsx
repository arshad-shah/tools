import { useEffect, useEffectEvent, useId, useMemo, useState } from 'react';
import { newId } from '@/shared/lib/id';
import { toToolError } from '@/shared/lib/errors';
import {
  Button,
  Checkbox,
  Highlight,
  Input,
  Label,
  Spinner,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
import { IconRedactSearch } from '@/shared/ui/icons';
import { searchMarkLabel } from '@/pdf/doc/ops/redact';
import { PRESETS, type RedactPreset } from '@/pdf/redact/patterns';
import {
  queryPattern,
  searchPages,
  type SearchMatch,
  type SearchQuery,
} from '@/pdf/redact/search';
import type { DocumentApi } from '../types';
import { pageFieldValues, type FormInfoCache } from './field-values';
import { useRedactUi } from './ui-store';

const PRESET_IDS = Object.keys(PRESETS) as RedactPreset[];

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/**
 * Find and mark (spec 10.1): literal or regex search with case and
 * whole-word options, or a validated preset, across every page's text.
 * Matches list with per-match checkboxes; marking is one grouped op.
 */
export function SearchPanel({ doc }: { doc: DocumentApi }) {
  const ui = useRedactUi();
  const findId = useId();
  const [text, setText] = useState('');
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [preset, setPreset] = useState<RedactPreset | null>(null);
  const [found, setFound] = useState<{
    key: string;
    results: SearchMatch[] | null;
    error: string | null;
    selected: Set<number>;
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const query: SearchQuery | null = useMemo(() => {
    if (!preset && !text) return null;
    return {
      text,
      regex,
      caseSensitive,
      wholeWord,
      ...(preset ? { preset } : {}),
    };
  }, [text, regex, caseSensitive, wholeWord, preset]);

  const pagesKey = doc.view.pages.map((p) => p.id).join(',');
  const key = query ? `${JSON.stringify(query)}|${pagesKey}` : '';
  const invalid = useMemo(() => {
    if (!query) return null;
    try {
      queryPattern(query);
      return null;
    } catch (e) {
      return toToolError(e).message;
    }
  }, [query]);

  const readPages = useEffectEvent(async () => {
    const pages = [];
    const forms: FormInfoCache = new Map();
    for (const [i, page] of doc.view.pages.entries()) {
      if (page.blank) continue;
      pages.push({
        pageId: page.id,
        pageNumber: i + 1,
        items: await doc.text(page),
        fields: await pageFieldValues(doc, page, forms),
      });
    }
    return pages;
  });

  useEffect(() => {
    if (!query || invalid) return;
    let live = true;
    const timer = setTimeout(async () => {
      setBusyKey(key);
      try {
        const results = searchPages(await readPages(), query);
        if (live)
          setFound({
            key,
            results,
            error: null,
            selected: new Set(results.map((_, i) => i)),
          });
      } catch (e) {
        if (live)
          setFound({
            key,
            results: null,
            error: toToolError(e).message,
            selected: new Set(),
          });
      } finally {
        if (live) setBusyKey(null);
      }
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key, query, invalid]);

  const current = found?.key === key ? found : null;
  const results = invalid ? null : (current?.results ?? null);
  const error = invalid ?? current?.error ?? null;
  const selected = current?.selected ?? new Set<number>();
  const busy = busyKey === key && !!query;
  const setSelected = (next: Set<number>) =>
    current && setFound({ ...current, selected: next });

  const mark = (which: SearchMatch[]) => {
    if (!which.length || !query) return;
    const ops = which.map((m) => ({
      type: 'redact.mark',
      params: {
        id: newId(),
        pageId: m.pageId,
        rects: m.rects,
        source: { kind: 'search', query, matched: m.text },
        fill: ui.fill,
        overlayText: ui.overlayText.trim() || null,
      },
    }));
    const done = doc.dispatch(ops, searchMarkLabel(which.length));
    if (done.length) doc.announce(searchMarkLabel(which.length));
  };

  const chosen = (results ?? []).filter((_, i) => selected.has(i));
  return (
    <Stack gap="3" aria-label="Find and mark">
      <div className="flex flex-col gap-1">
        <Label htmlFor={findId}>Find</Label>
        <Input
          id={findId}
          value={text}
          onChange={(v) => {
            setText(v);
            if (v) setPreset(null);
          }}
          invalid={!!error}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${findId}-error` : undefined}
          autoFocus={ui.searchOpen}
          leadingSlot={<IconRedactSearch size="sm" />}
        />
        {error ? (
          <Text id={`${findId}-error`} size="sm" className="text-danger">
            {error}
          </Text>
        ) : null}
      </div>
      <SwitchRow
        label="Regular expression"
        checked={regex}
        onChange={setRegex}
      />
      <SwitchRow
        label="Match case"
        checked={caseSensitive}
        onChange={setCaseSensitive}
      />
      <SwitchRow
        label="Whole words"
        checked={wholeWord}
        onChange={setWholeWord}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Patterns">
        {PRESET_IDS.map((id) => (
          <Button
            key={id}
            size="sm"
            variant={preset === id ? 'primary' : 'secondary'}
            aria-pressed={preset === id}
            onClick={() => setPreset(preset === id ? null : id)}
          >
            {PRESETS[id].label}
          </Button>
        ))}
      </div>
      {busy ? (
        <div className="flex items-center gap-2">
          <Spinner size="sm" decorative />
          <Text size="sm" tone="muted">
            Searching
          </Text>
        </div>
      ) : null}
      {results ? (
        <Stack gap="2">
          <Text size="sm" tone="muted" aria-live="polite">
            {results.length === 1 ? '1 match' : `${results.length} matches`}
          </Text>
          {results.length ? (
            <ul
              className="flex max-h-72 flex-col gap-1 overflow-y-auto"
              aria-label="Matches"
            >
              {results.map((m, i) => (
                <li
                  key={`${m.pageId}-${i}`}
                  className="flex items-start gap-2 rounded-md p-1 hover:bg-surface-2"
                >
                  <Checkbox
                    checked={selected.has(i)}
                    aria-label={`Match ${i + 1} on page ${m.pageNumber}: ${m.text}`}
                    onCheckedChange={(on) => {
                      const next = new Set(selected);
                      if (on) next.add(i);
                      else next.delete(i);
                      setSelected(next);
                    }}
                  />
                  <span className="min-w-0 text-sm">
                    <Text size="xs" tone="muted" as="span" className="mr-2">
                      Page {m.pageNumber}
                    </Text>
                    <Highlight
                      text={m.context}
                      start={m.contextStart}
                      length={m.text.length}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={!results.length}
              onClick={() => mark(results)}
            >
              Mark all
            </Button>
            <Button
              size="sm"
              disabled={!chosen.length}
              onClick={() => mark(chosen)}
            >
              Mark selected
            </Button>
          </div>
        </Stack>
      ) : null}
    </Stack>
  );
}
