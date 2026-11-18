import {
  Button,
  CodeBlock,
  Disclosure,
  Inline,
  Notice,
  Stack,
  TextArea,
} from '@arshad-shah/cynosure';
import { eraser } from '@arshad-shah/cynosure/icons';
import { useMemo } from 'react';
import { cleanUrl, DEFAULT_TRACKING } from '../lib/clean';

interface Props {
  url: string;
  patterns: string[];
  onPatternsChange(p: string[]): void;
  onApply(url: string): void;
}

/** Strips tracking params; the pattern list is editable and remembered. */
export function CleanPanel({
  url,
  patterns,
  onPatternsChange,
  onApply,
}: Props) {
  const result = useMemo(() => cleanUrl(url, patterns), [url, patterns]);
  const n = result.removed.length;
  return (
    <Stack gap="5">
      {n ? (
        <Notice
          tone="info"
          title={`${n} tracking parameter${n === 1 ? '' : 's'} found`}
        >
          {result.removed.join(', ')}
        </Notice>
      ) : (
        <Notice tone="success" title="No tracking parameters found">
          This link has nothing to clean.
        </Notice>
      )}
      <CodeBlock title="Clean link" code={result.url} wrap />
      {n ? (
        <Inline>
          <Button icon={eraser} onClick={() => onApply(result.url)}>
            Clean URL
          </Button>
        </Inline>
      ) : null}
      <Disclosure summary="Tracking parameters" size="sm">
        <Stack gap="3">
          <TextArea
            label="Tracking parameters to remove"
            description="One per line; * at the end matches any ending."
            rows={5}
            spellCheck={false}
            value={patterns.join('\n')}
            onChange={(v) =>
              onPatternsChange(
                v
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
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
      </Disclosure>
    </Stack>
  );
}
