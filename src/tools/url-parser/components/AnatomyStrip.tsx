import { useClipboard } from '@/shared/lib/clipboard';
import { Button, Inline, Text, Tooltip } from '@/shared/ui';
import type { PartId, Segment } from '../lib/anatomy';

const TONE: Record<PartId, string> = {
  protocol: 'text-syntax-keyword',
  userinfo: 'text-syntax-attr',
  host: 'text-syntax-key',
  port: 'text-syntax-number',
  path: 'text-syntax-string',
  query: 'text-syntax-fn',
  fragment: 'text-syntax-tag',
};

/** The URL as coloured parts; activating one copies it. */
export function AnatomyStrip({ segments }: { segments: Segment[] }) {
  const { copiedKey, copy } = useClipboard();
  return (
    <Inline gap="1" align="center" wrap aria-label="URL parts" role="group">
      {segments.map((s) => (
        <Tooltip
          key={s.id}
          content={copiedKey === s.id ? 'Copied' : `${s.label}: click to copy`}
        >
          <Button
            variant="ghost"
            size="sm"
            className="max-w-full text-left break-all whitespace-normal"
            aria-label={`Copy ${s.label.toLowerCase()} ${s.text}`}
            onClick={() => void copy(s.text, s.id)}
          >
            <Text as="span" size="sm" className={`font-mono ${TONE[s.id]}`}>
              {s.text}
            </Text>
          </Button>
        </Tooltip>
      ))}
    </Inline>
  );
}
