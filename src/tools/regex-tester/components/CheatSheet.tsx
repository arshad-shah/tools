import React from 'react';
import {
  Code,
  Drawer,
  Kbd,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/shared/ui';

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
  <Drawer open={open} onOpenChange={onOpenChange} title="Regex cheat sheet">
    <Stack gap="5">
      {SECTIONS.map((s) => (
        <Stack gap="2" key={s.title}>
          <Text size="sm" weight="semibold">
            {s.title}
          </Text>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Syntax</TableHead>
                <TableHead>Meaning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.rows.map(([syntax, meaning]) => (
                <TableRow key={syntax}>
                  <TableCell>
                    <Code className="whitespace-pre">{syntax}</Code>
                  </TableCell>
                  <TableCell>{meaning}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      ))}
      <Stack gap="2">
        <Text size="sm" weight="semibold">
          Shortcuts
        </Text>
        {SHORTCUTS.map(([keys, what]) => (
          <Text as="div" size="sm" key={keys}>
            <Kbd keys={keys} /> {what}
          </Text>
        ))}
      </Stack>
    </Stack>
  </Drawer>
);
