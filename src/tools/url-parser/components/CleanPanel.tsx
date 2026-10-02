import { useMemo } from 'react';
import { IconEraser } from '@/shared/ui/icons';
import {
  Button,
  Code,
  CopyButton,
  EmptyState,
  Inline,
  Label,
  Stack,
  Text,
  Textarea,
} from '@/shared/ui';
import { cleanUrl, DEFAULT_TRACKING } from '../lib/clean';

interface Props {
  url: string;
  patterns: string[];
  onPatternsChange(p: string[]): void;
  onApply(url: string): void;
}

/** Strips tracking params; the pattern list is editable and persisted. */
export function CleanPanel({
  url,
  patterns,
  onPatternsChange,
  onApply,
}: Props) {
  const result = useMemo(() => cleanUrl(url, patterns), [url, patterns]);
  return (
    <Stack gap="3">
      {result.removed.length ? (
        <Text size="sm">
          Removes {result.removed.length} tracking{' '}
          {result.removed.length === 1 ? 'parameter' : 'parameters'}:{' '}
          {result.removed.join(', ')}
        </Text>
      ) : (
        <EmptyState size="sm" title="No tracking parameters found" />
      )}
      <Code block className="break-all">
        {result.url}
      </Code>
      <Inline gap="2">
        <CopyButton variant="text" label="clean link" value={result.url} />
        <Button
          size="sm"
          variant="primary"
          leftIcon={<IconEraser size="sm" />}
          disabled={!result.removed.length}
          onClick={() => onApply(result.url)}
        >
          Clean URL
        </Button>
      </Inline>
      <Stack gap="1">
        <Label htmlFor="tracking-list">
          Tracking parameters (one per line, * matches any ending)
        </Label>
        <Textarea
          id="tracking-list"
          rows={5}
          value={patterns.join('\n')}
          onChange={(v) =>
            onPatternsChange(
              v
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          spellCheck={false}
          className="font-mono"
        />
        <Inline>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPatternsChange(DEFAULT_TRACKING)}
          >
            Reset list
          </Button>
        </Inline>
      </Stack>
    </Stack>
  );
}
