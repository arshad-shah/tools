import {
  CopyButton,
  DescriptionList,
  Inline,
  Text,
} from '@arshad-shah/cynosure';
import type { Segment } from '../lib/anatomy';

/** The URL's parts as written (encoded), each with its own Copy. */
export function AnatomyStrip({ segments }: { segments: Segment[] }) {
  return (
    <DescriptionList
      size="sm"
      layout="inline"
      divided
      items={segments.map((s) => ({
        id: s.id,
        term: s.label,
        detail: (
          <Inline gap="2" align="center" justify="between">
            <Text as="span" variant="code" wrap="break">
              {s.text}
            </Text>
            <CopyButton
              size="sm"
              value={s.text}
              labels={{ copy: `Copy ${s.label.toLowerCase()} ${s.text}` }}
            />
          </Inline>
        ),
      }))}
    />
  );
}
