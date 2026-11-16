import React from 'react';
import {
  DescriptionList,
  Heading,
  Inline,
  Kbd,
  Sheet,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { hotkeyCaps } from '@/shared/lib/hotkeys';

const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Characters',
    rows: [
      ['.', 'Any character except a line break (any with the s flag)'],
      ['\\d  \\D', 'A digit, a non-digit'],
      ['\\w  \\W', 'A word character, a non-word character'],
      ['\\s  \\S', 'Whitespace, non-whitespace'],
      ['[abc]', 'Any of a, b or c'],
      ['[^abc]', 'Any character except a, b or c'],
      ['[a-z]', 'Any character from a to z'],
      ['\\p{L}', 'A Unicode letter (u or v flag)'],
    ],
  },
  {
    title: 'Anchors',
    rows: [
      ['^  $', 'Start and end of input (of a line with the m flag)'],
      ['\\b  \\B', 'Word boundary, not a word boundary'],
    ],
  },
  {
    title: 'Quantifiers',
    rows: [
      ['a*  a+  a?', 'Zero or more, one or more, optional'],
      ['a{3}  a{2,}  a{2,5}', 'Exactly 3, 2 or more, 2 to 5'],
      ['a+?', 'As few as possible (lazy)'],
    ],
  },
  {
    title: 'Groups and lookarounds',
    rows: [
      ['(abc)', 'Capture group'],
      ['(?<name>abc)', 'Named capture group'],
      ['(?:abc)', 'Group without capturing'],
      ['\\1  \\k<name>', 'Back-reference to a group'],
      ['a|b', 'a or b'],
      ['(?=abc)  (?!abc)', 'Followed by, not followed by'],
      ['(?<=abc)  (?<!abc)', 'Preceded by, not preceded by'],
    ],
  },
  {
    title: 'Replacement',
    rows: [
      ['$1  $<name>', 'A group'],
      ['$&', 'The whole match'],
      ['$$', 'A literal dollar sign'],
    ],
  },
];

const SHORTCUTS: [string, string][] = [
  ['Alt+G', 'Toggle the global flag (Alt with I, M, S, U, Y, D likewise)'],
  ['Alt+1', 'Match mode (Alt+2 Replace, Alt+3 Split, Alt+4 Tests)'],
  ['Mod+Shift+S', 'Copy a share link'],
];

interface CheatSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

/** Common regex syntax and the tool's shortcuts, in a side drawer. */
export const CheatSheet: React.FC<CheatSheetProps> = ({
  open,
  onOpenChange,
}) => (
  <Sheet
    open={open}
    onOpenChange={onOpenChange}
    side="end"
    title="Regex cheat sheet"
  >
    <Stack gap="6">
      {SECTIONS.map((s) => (
        <Stack gap="3" key={s.title}>
          <Heading level={3} size="sm">
            {s.title}
          </Heading>
          <DescriptionList
            size="sm"
            divided
            items={s.rows.map(([syntax, meaning]) => ({
              id: syntax,
              term: (
                <Text as="span" variant="code" wrap="pre">
                  {syntax}
                </Text>
              ),
              detail: meaning,
            }))}
          />
        </Stack>
      ))}
      <Stack gap="3">
        <Heading level={3} size="sm">
          Shortcuts
        </Heading>
        {SHORTCUTS.map(([keys, what]) => (
          <Inline gap="3" align="center" key={keys}>
            <Kbd keys={hotkeyCaps(keys)} size="sm" />
            <Text size="sm">{what}</Text>
          </Inline>
        ))}
      </Stack>
    </Stack>
  </Sheet>
);
