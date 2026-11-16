import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  HighlightedText,
  Inline,
  ScrollArea,
  Stack,
  Switch,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { redactSearch } from '@arshad-shah/cynosure/icons';
import { newId } from '@/shared/lib/id';
import { toToolError } from '@/shared/lib/errors';
import { searchMarkLabel } from '@/pdf/doc/ops/redact';
import { PRESETS, type RedactPreset } from '@/pdf/redact/patterns';
import {
  queryPattern,
  searchPages,
  type SearchMatch,
  type SearchQuery,
} from '@/pdf/redact/search';
import { LoadingLine } from '../../ui/states';
import type { DocumentApi } from '../types';
import { pageFieldValues, type FormInfoCache } from './field-values';
import { useRedactUi } from './ui-store';

const PRESET_IDS = Object.keys(PRESETS) as RedactPreset[];

/**
 * Find and mark (spec 10.1): literal or regex search with case and
 * whole-word options, or a validated preset, across every page's text.
 * Matches list with per-match checkboxes; marking is one grouped op.
 */
export function SearchPanel({ doc }: { doc: DocumentApi }) {
  const ui = useRedactUi();
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
    <Stack gap="4" aria-label="Find and mark">
      <TextField
        label="Find"
        size="sm"
        iconStart={redactSearch}
        value={text}
        onChange={(v) => {
          setText(v);
          if (v) setPreset(null);
        }}
        error={error ?? undefined}
        autoFocus={ui.searchOpen}
      />
      <Stack gap="2">
        <Switch
          label="Regular expression"
          size="sm"
          checked={regex}
          onChange={setRegex}
        />
        <Switch
          label="Match case"
          size="sm"
          checked={caseSensitive}
          onChange={setCaseSensitive}
        />
        <Switch
          label="Whole words"
          size="sm"
          checked={wholeWord}
          onChange={setWholeWord}
        />
      </Stack>
      <Inline gap="2" wrap role="group" aria-label="Patterns">
        {PRESET_IDS.map((id) => (
          <Button
            key={id}
            size="sm"
            variant={preset === id ? 'solid' : 'outline'}
            tone={preset === id ? 'accent' : 'neutral'}
            pressed={preset === id}
            onClick={() => setPreset(preset === id ? null : id)}
          >
            {PRESETS[id].label}
          </Button>
        ))}
      </Inline>
      {busy ? <LoadingLine label="Searching" /> : null}
      {results ? (
        <Stack gap="3">
          <Text size="sm" tone="muted" aria-live="polite">
            {results.length === 1 ? '1 match' : `${results.length} matches`}
          </Text>
          {results.length ? (
            <ScrollArea label="Matches" style={{ maxBlockSize: '18rem' }}>
              <Stack gap="2">
                {results.map((m, i) => (
                  <Checkbox
                    key={`${m.pageId}-${i}`}
                    size="sm"
                    checked={selected.has(i)}
                    label={
                      <HighlightedText
                        text={m.context}
                        positions={Array.from(
                          { length: m.text.length },
                          (_, k) => m.contextStart + k,
                        )}
                      />
                    }
                    description={`Match ${i + 1}, page ${m.pageNumber}`}
                    onChange={(on) => {
                      const next = new Set(selected);
                      if (on) next.add(i);
                      else next.delete(i);
                      setSelected(next);
                    }}
                  />
                ))}
              </Stack>
            </ScrollArea>
          ) : null}
          <Inline gap="2" wrap>
            <Button
              size="sm"
              variant="solid"
              tone="accent"
              disabled={!results.length}
              onClick={() => mark(results)}
            >
              Mark all
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!chosen.length}
              onClick={() => mark(chosen)}
            >
              Mark selected
            </Button>
          </Inline>
        </Stack>
      ) : null}
    </Stack>
  );
}
