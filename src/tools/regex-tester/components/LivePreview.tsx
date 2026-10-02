import React from 'react';
import { IconAlertCircle, IconPlayCircle } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Text,
} from '@/shared/ui';
import type { Match } from '../lib/match';

/** Live-preview classes (formerly a CSS module). */
const PREVIEW = {
  preview:
    'relative grid max-h-[420px] grid-cols-[auto_1fr] overflow-auto rounded-lg border border-line bg-surface font-mono text-sm leading-[1.7] text-fg shadow-[inset_3px_0_0_0_var(--color-accent)]',
  gutter:
    'sticky left-0 select-none border-r border-line bg-surface-2 py-3 pr-3 pl-[18px] text-right text-fg-subtle tabular-nums',
  gutterLine: 'block text-[0.85em] opacity-70',
  content:
    'min-w-0 px-4 py-3 whitespace-pre-wrap [word-break:break-word] [overflow-wrap:anywhere]',
  mark: 'rounded-[3px] bg-warning px-[3px] py-px text-canvas box-decoration-clone',
} as const;

interface LivePreviewProps {
  testString: string;
  matches: Match[];
  coverage: number;
  /** The worker is still running the current input. */
  matching: boolean;
  /** The current input has a result. */
  hasResult: boolean;
  runError: string;
}

/** The test string with matches highlighted, plus a line-number gutter. */
export const LivePreview: React.FC<LivePreviewProps> = ({
  testString,
  matches,
  coverage,
  matching,
  hasResult,
  runError,
}) => {
  const renderHighlighted = () => {
    if (!testString) return null;
    if (matches.length === 0) return testString;
    const out: React.ReactNode[] = [];
    let last = 0;
    matches.forEach((m, i) => {
      if (m.index > last) {
        out.push(
          <span key={`t-${i}`}>{testString.substring(last, m.index)}</span>,
        );
      }
      out.push(
        <mark
          key={`m-${i}`}
          title={`Match #${i + 1}: "${m.text}"`}
          className={PREVIEW.mark}
        >
          {testString.substring(m.index, m.index + m.length)}
        </mark>,
      );
      last = m.index + m.length;
    });
    if (last < testString.length) {
      out.push(<span key="t-end">{testString.substring(last)}</span>);
    }
    return out;
  };

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline gap="2" align="center">
            <IconPlayCircle size="lg" />
            <CardTitle as="h2">Live preview</CardTitle>
          </Inline>
          <Inline gap="2">
            <Badge variant="solid" tone="accent" size="sm">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </Badge>
            {matches.length > 0 && (
              <Badge variant="soft" tone="neutral" size="sm">
                {coverage}% coverage
              </Badge>
            )}
          </Inline>
        </Inline>
      </CardHeader>
      <CardBody>
        <div className={PREVIEW.preview}>
          <div className={PREVIEW.gutter} aria-hidden>
            {Array.from({ length: testString.split('\n').length }).map(
              (_, i) => (
                <span key={i} className={PREVIEW.gutterLine}>
                  {i + 1}
                </span>
              ),
            )}
          </div>
          <div className={PREVIEW.content}>{renderHighlighted()}</div>
        </div>
        {matching && (
          <Text size="sm" tone="subtle" className="pt-3">
            Running the pattern
          </Text>
        )}
        {matches.length === 0 && hasResult && !runError && (
          <Inline className="pt-3">
            <Alert status="warning" icon={<IconAlertCircle />}>
              <AlertDescription>
                No matches found — try adjusting your pattern or test string.
              </AlertDescription>
            </Alert>
          </Inline>
        )}
      </CardBody>
    </Card>
  );
};
