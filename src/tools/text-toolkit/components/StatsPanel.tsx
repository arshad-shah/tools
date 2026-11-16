import {
  Card,
  EmptyState,
  Grid,
  Inline,
  Select,
  Stack,
  Stat,
  Switch,
  Table,
  Text,
} from '@arshad-shah/cynosure';
import { useDeferredValue, useMemo } from 'react';
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

  const tiles: [string, number][] = [
    ['Characters', s.chars],
    ['Characters without spaces', s.charsNoSpaces],
    ['Sentences', s.sentences],
    ['Paragraphs', s.paragraphs],
    ['Lines', s.lines],
    ['Bytes', s.bytes],
  ];

  return (
    <Card as="section" title="Statistics">
      <Stack gap="5">
        <Inline gap="4" wrap aria-live="polite">
          {[
            count(s.words, 'word'),
            `${formatMinutes(s.readingMinutes)} reading`,
            `${formatMinutes(s.speakingMinutes)} speaking`,
          ].map((t) => (
            <Text key={t} tone="muted">
              {t}
            </Text>
          ))}
        </Inline>
        <Grid minItemWidth="8rem" gap="3">
          {tiles.map(([label, value]) => (
            <Stat
              key={label}
              size="sm"
              variant="soft"
              label={label}
              value={value.toLocaleString('en-US')}
            />
          ))}
        </Grid>
        <Inline gap="5" wrap align="end">
          <Select
            label="Language"
            width="sm"
            value={locale}
            onChange={onLocale}
            options={LOCALES}
          />
          <Switch
            label="Hide common words"
            checked={stopWords}
            onChange={onStopWords}
          />
        </Inline>
        {s.topWords.length === 0 ? (
          <EmptyState size="sm" title="No words yet" />
        ) : (
          <Table
            caption="Top words"
            size="sm"
            rows={s.topWords.map(([word, n]) => ({ word, n }))}
            getRowId={(r) => r.word}
            columns={[
              {
                key: 'word',
                header: 'Word',
                rowHeader: true,
                cell: (r) => r.word,
              },
              {
                key: 'n',
                header: 'Count',
                align: 'end',
                cell: (r) => r.n.toLocaleString('en-US'),
              },
            ]}
          />
        )}
      </Stack>
    </Card>
  );
}
