import {
  CopyButton,
  DescriptionList,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import type { ReactNode } from 'react';

export interface Fact {
  term: string;
  /** Text shown in code type with a copy button. */
  value?: string;
  /** Anything else in place of a copyable value. */
  detail?: ReactNode;
  note?: string;
}

/** Terms and values, each value copyable, with an optional note under it. */
export function Facts({ items, label }: { items: Fact[]; label: string }) {
  return (
    <DescriptionList
      aria-label={label}
      size="sm"
      divided
      items={items.map((f) => ({
        id: f.term,
        term: f.term,
        detail: (
          <Stack gap="1">
            {f.value !== undefined ? (
              <Inline gap="2" align="center" wrap={false}>
                <Text as="span" variant="code" wrap="break">
                  {f.value}
                </Text>
                <CopyButton
                  size="sm"
                  variant="ghost"
                  value={f.value}
                  labels={{ copy: `Copy ${f.term.toLowerCase()}` }}
                />
              </Inline>
            ) : (
              f.detail
            )}
            {f.note ? (
              <Text as="span" size="sm" tone="muted">
                {f.note}
              </Text>
            ) : null}
          </Stack>
        ),
      }))}
    />
  );
}
