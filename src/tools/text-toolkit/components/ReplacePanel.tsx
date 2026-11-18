import {
  Button,
  Card,
  Grid,
  Inline,
  Notice,
  Stack,
  Switch,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { useEffect, useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import type { RegexRunner } from '@/tools/regex-tester/lib/runner';
import {
  buildFindPattern,
  replacementFor,
  type FindOptions,
} from '../lib/find';

export interface ReplacePanelProps {
  text: string;
  runner: RegexRunner;
  options: FindOptions;
  onOptions(patch: Partial<FindOptions>): void;
  /** Applies the replaced text when it was made from `from`. */
  onReplace(from: string, output: string, count: number): void;
}

/** The result of one live count, tagged with the query it answers. */
type CountResult =
  | { key: string; count: number }
  | { key: string; error: string };

const COUNT_DELAY_MS = 200;

const plural = (n: number, word: string) =>
  `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 'es'}`;

/**
 * Find and replace (spec §9.1). Matching runs in the killable regex worker,
 * so a catastrophic pattern times out with an inline error instead of
 * freezing the tab.
 */
export function ReplacePanel({
  text,
  runner,
  options,
  onOptions,
  onReplace,
}: ReplacePanelProps) {
  const [find, setFind] = useState('');
  const [replacement, setReplacement] = useState('');
  const [counted, setCounted] = useState<CountResult | null>(null);
  const [replaceError, setReplaceError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const { pattern, flags } = buildFindPattern(find, options);
  const key = JSON.stringify([pattern, flags, text]);

  useEffect(() => {
    if (find === '') return;
    let live = true;
    const timer = setTimeout(() => {
      runner.match(pattern, flags, text).then(
        (matches) => {
          if (live) setCounted({ key, count: matches.length });
        },
        (e: unknown) => {
          const err = toToolError(e);
          if (live && err.code !== 'CANCELLED')
            setCounted({ key, error: err.message });
        },
      );
    }, COUNT_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [runner, find, pattern, flags, text, key]);

  const current = find !== '' && counted?.key === key ? counted : null;
  const shownError =
    replaceError?.key === key
      ? replaceError.message
      : current && 'error' in current
        ? current.error
        : null;

  const replaceAll = () => {
    if (find === '') return;
    const from = text;
    const at = key;
    setBusy(true);
    runner
      .replace(pattern, flags, from, replacementFor(replacement, options.regex))
      .then(
        ({ output, count }) => {
          setReplaceError(null);
          onReplace(from, output, count);
        },
        (e: unknown) => {
          const err = toToolError(e);
          if (err.code !== 'CANCELLED')
            setReplaceError({ key: at, message: err.message });
        },
      )
      .finally(() => setBusy(false));
  };

  return (
    <Card as="section" title="Find and replace">
      <Stack gap="4">
        <Grid minItemWidth="12rem" gap="3">
          <TextField
            label="Find"
            value={find}
            onChange={setFind}
            spellCheck={false}
            autoComplete="off"
          />
          <TextField
            label="Replace with"
            value={replacement}
            onChange={setReplacement}
            spellCheck={false}
            autoComplete="off"
          />
        </Grid>
        <Inline gap="5" wrap>
          <Switch
            label="Regular expression"
            checked={options.regex}
            onChange={(v) => onOptions({ regex: v })}
          />
          <Switch
            label="Match case"
            checked={options.caseSensitive}
            onChange={(v) => onOptions({ caseSensitive: v })}
          />
          <Switch
            label="Whole word"
            checked={options.wholeWord}
            onChange={(v) => onOptions({ wholeWord: v })}
          />
        </Inline>
        <Inline gap="3" align="center" wrap>
          <Button
            variant="soft"
            disabled={find === '' || busy}
            loading={busy}
            onClick={replaceAll}
          >
            Replace all
          </Button>
          <Text size="sm" tone="muted" aria-live="polite">
            {current && 'count' in current
              ? current.count === 0
                ? 'No matches'
                : plural(current.count, 'match')
              : ''}
          </Text>
        </Inline>
        {shownError ? (
          <Notice tone="danger" size="sm">
            {shownError}
          </Notice>
        ) : null}
      </Stack>
    </Card>
  );
}
