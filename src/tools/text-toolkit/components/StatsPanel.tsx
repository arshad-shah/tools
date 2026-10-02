import { useDeferredValue, useId, useMemo } from 'react';
import { Label, MetaList, Select, Statistic, Switch } from '@/shared/ui';
import { textStats } from '../lib/stats';

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'th', label: 'Thai' },
];

const count = (n: number, word: string) =>
  `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

/** Minutes as plain words: "under 1 minute", "3 minutes". */
function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0 minutes';
  if (minutes < 1) return 'under 1 minute';
  return count(Math.round(minutes), 'minute');
}

export interface StatsPanelProps {
  text: string;
  locale: string;
  stopWords: boolean;
  onLocale(locale: string): void;
  onStopWords(on: boolean): void;
}

/** Live statistics for the text (spec §9.1). */
export function StatsPanel({
  text,
  locale,
  stopWords,
  onLocale,
  onStopWords,
}: StatsPanelProps) {
  const deferred = useDeferredValue(text);
  const s = useMemo(
    () => textStats(deferred, locale, { stopWords }),
    [deferred, locale, stopWords],
  );
  const localeId = useId();
  const stopId = useId();
  const headingId = useId();

  const tiles: [string, number][] = [
    ['Words', s.words],
    ['Characters', s.chars],
    ['Characters without spaces', s.charsNoSpaces],
    ['Sentences', s.sentences],
    ['Paragraphs', s.paragraphs],
    ['Lines', s.lines],
    ['Bytes', s.bytes],
  ];

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-md font-semibold text-fg">
        Statistics
      </h2>
      <div aria-live="polite">
        <MetaList
          items={[
            count(s.words, 'word'),
            `${formatMinutes(s.readingMinutes)} reading`,
            `${formatMinutes(s.speakingMinutes)} speaking`,
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <Statistic
            key={label}
            label={label}
            value={value.toLocaleString('en-US')}
            className="p-3"
          />
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-40 flex-col gap-1">
          <Label htmlFor={localeId}>Language</Label>
          <Select
            id={localeId}
            value={locale}
            onValueChange={onLocale}
            items={LOCALES}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={stopId}
            checked={stopWords}
            onCheckedChange={onStopWords}
          />
          <Label htmlFor={stopId}>Hide common words</Label>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-fg">Top words</h3>
        {s.topWords.length === 0 ? (
          <p className="text-sm text-fg-muted">No words yet</p>
        ) : (
          <ol aria-label="Top words" className="flex flex-col gap-1 text-sm">
            {s.topWords.map(([word, n]) => (
              <li
                key={word}
                className="flex justify-between gap-4 rounded-sm px-2 py-1 odd:bg-surface-2"
              >
                <span className="truncate text-fg">{word}</span>
                <span className="font-mono text-fg-muted">{n}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
