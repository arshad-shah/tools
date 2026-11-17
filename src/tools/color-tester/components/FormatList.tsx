import {
  CopyButton,
  DescriptionList,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import { formatColor, type Color } from '@/shared/lib/colour';
import { FORMATS, namedText } from '../lib/formats';

/** Every output format of the colour, each with a copy button. */
export function FormatList({ color }: { color: Color }) {
  const rows = useMemo(
    () => FORMATS.map((f) => ({ ...f, text: formatColor(color, f.fmt) })),
    [color],
  );
  const named = useMemo(() => namedText(color), [color]);

  return (
    <Stack gap="4">
      <Text size="sm" tone="muted">
        {`Named colour: ${named}`}
      </Text>
      <DescriptionList
        layout="inline"
        divided
        size="sm"
        items={rows.map((r) => ({
          id: r.fmt,
          term: r.label,
          detail: (
            <Inline gap="2" align="center" justify="between">
              <Text variant="code" truncate>
                {r.text}
              </Text>
              <CopyButton
                size="sm"
                variant="ghost"
                value={r.text}
                labels={{ copy: `Copy ${r.label}` }}
              />
            </Inline>
          ),
        }))}
      />
    </Stack>
  );
}
