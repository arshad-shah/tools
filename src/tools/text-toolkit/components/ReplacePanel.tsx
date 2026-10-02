import { useEffect, useId, useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import {
  Alert,
  Button,
  Heading,
  Inline,
  Input,
  Label,
  Stack,
  SwitchField,
  Text,
} from '@/shared/ui';
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
  const findId = useId();
  const replaceId = useId();
  const headingId = useId();

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
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <Heading level={2} size="md" id={headingId}>
        Find and replace
      </Heading>
      <Inline gap="3" wrap align="start">
        <Stack gap="1" className="min-w-40 flex-1">
          <Label htmlFor={findId}>Find</Label>
          <Input
            id={findId}
            value={find}
            onChange={setFind}
            spellCheck={false}
            autoComplete="off"
          />
        </Stack>
        <Stack gap="1" className="min-w-40 flex-1">
          <Label htmlFor={replaceId}>Replace with</Label>
          <Input
            id={replaceId}
            value={replacement}
            onChange={setReplacement}
            spellCheck={false}
            autoComplete="off"
          />
        </Stack>
      </Inline>
      <Inline gap="4" wrap>
        <SwitchField
          label="Regular expression"
          checked={options.regex}
          onCheckedChange={(v) => onOptions({ regex: v })}
        />
        <SwitchField
          label="Match case"
          checked={options.caseSensitive}
          onCheckedChange={(v) => onOptions({ caseSensitive: v })}
        />
        <SwitchField
          label="Whole word"
          checked={options.wholeWord}
          onCheckedChange={(v) => onOptions({ wholeWord: v })}
        />
      </Inline>
      <Inline gap="3" wrap>
        <Button
          type="button"
          size="sm"
          variant="primary"
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
        <Alert status="danger" size="sm">
          {shownError}
        </Alert>
      ) : null}
    </section>
  );
}
