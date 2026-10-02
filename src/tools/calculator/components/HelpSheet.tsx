import React from 'react';
import {
  Drawer,
  Inline,
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

/** Keys and what they do; each `keys` entry is one Kbd combo. */
const HELP_KEYS: { keys: string[]; action: string }[] = [
  { keys: ['0', '9'], action: 'Type digits (0 to 9) into the active line' },
  { keys: ['.'], action: 'Decimal point' },
  { keys: ['+', '-', '*', '/'], action: 'Add, subtract, multiply, divide' },
  { keys: ['^'], action: 'Power' },
  { keys: ['%'], action: 'Percent' },
  { keys: ['Enter'], action: 'Record the line in history and start a new one' },
  { keys: ['='], action: 'Same as Enter' },
  { keys: ['Backspace'], action: 'Delete before the caret' },
  { keys: ['Delete'], action: 'Clear the active line' },
  { keys: ['Escape'], action: 'Clear the active line' },
  { keys: ['Mod+Shift+C'], action: 'Copy the active result' },
  { keys: ['Mod+K'], action: 'Command palette' },
  { keys: ['?'], action: 'Show this help' },
];

const SYNTAX: { example: string; meaning: string }[] = [
  { example: 'a = 5', meaning: 'Assign a variable for later lines' },
  { example: 'ans * 2', meaning: 'The previous line result' },
  { example: 'line2 / 3', meaning: 'The result of line 2' },
  { example: '5 km to mi', meaning: 'Unit conversion' },
  { example: '# note', meaning: 'A comment (also //)' },
];

interface HelpSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

/**
 * The `?` help sheet: the page keys (they act when focus is not in a text
 * field; the lines themselves edit like any text box) and the sheet syntax.
 */
export const HelpSheet: React.FC<HelpSheetProps> = ({ open, onOpenChange }) => (
  <Drawer
    open={open}
    onOpenChange={onOpenChange}
    side="bottom"
    title="Calculator keys"
  >
    <Stack gap="4">
      <Text size="sm" tone="muted">
        Keys act on the active line when focus is outside the lines.
      </Text>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {HELP_KEYS.map((row) => (
            <TableRow key={row.action + row.keys.join()}>
              <TableCell>
                <Inline gap="1">
                  {row.keys.map((k) => (
                    <Kbd key={k} keys={k} />
                  ))}
                  <Text as="span" className="sr-only">
                    {row.keys.join(' or ')}
                  </Text>
                </Inline>
              </TableCell>
              <TableCell>{row.action}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Example</TableHead>
            <TableHead>Meaning</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SYNTAX.map((row) => (
            <TableRow key={row.example}>
              <TableCell>
                <Text as="span" mono>
                  {row.example}
                </Text>
              </TableCell>
              <TableCell>{row.meaning}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  </Drawer>
);
