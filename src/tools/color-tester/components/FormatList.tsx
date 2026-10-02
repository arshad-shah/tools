import { useMemo } from 'react';
import { formatColor, type Color } from '@/shared/lib/colour';
import { useClipboard } from '@/shared/lib/clipboard';
import { IconCheck, IconCopy } from '@/shared/ui/icons';
import { Code, IconButton, Stack, Text } from '@/shared/ui';
import { FORMATS, namedText } from '../lib/formats';

/** Every output format of the colour, each with a copy button. */
export function FormatList({ color }: { color: Color }) {
  const { copiedKey, copy } = useClipboard();
  const rows = useMemo(
    () => FORMATS.map((f) => ({ ...f, text: formatColor(color, f.fmt) })),
    [color],
  );
  const named = useMemo(() => namedText(color), [color]);

  return (
    <Stack gap="2">
      <Text size="sm" tone="muted">
        {`Named colour: ${named}`}
      </Text>
      <dl className="grid gap-1">
        {rows.map((r) => (
          <div
            key={r.fmt}
            className="grid grid-cols-[4rem_1fr] items-center gap-2"
          >
            <dt className="text-sm text-fg-muted">{r.label}</dt>
            <dd className="flex min-w-0 items-center gap-2">
              <Code data-format={r.fmt} className="min-w-0 truncate">
                {r.text}
              </Code>
              <IconButton
                label={`Copy ${r.label}`}
                icon={copiedKey === r.fmt ? IconCheck : IconCopy}
                size="sm"
                variant="ghost"
                onClick={() => void copy(r.text, r.fmt)}
              />
            </dd>
          </div>
        ))}
      </dl>
    </Stack>
  );
}
