import {
  Dialog,
  Inline,
  Kbd,
  shortcutKeys,
  Stack,
  Table,
  Text,
} from '@arshad-shah/cynosure';
import React from 'react';

/** Keys and what they do; each `keys` entry is one Kbd combo. */
type KeyRow = { keys: string[]; action: string };
const HELP_KEYS: KeyRow[] = [
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

type SyntaxRow = { example: string; meaning: string };
const SYNTAX: SyntaxRow[] = [
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

/** `Mod+Shift+C` as this platform's key caps; one key as itself. */
const combo = (k: string) =>
  k.length > 1 && k.includes('+') ? shortcutKeys(k.toLowerCase()) : [k];

/**
 * The `?` help: the page keys (they act when focus is not in a text field;
 * the lines themselves edit like any text box) and the sheet syntax.
 */
export const HelpSheet: React.FC<HelpSheetProps> = ({ open, onOpenChange }) => (
  <Dialog
    open={open}
    onOpenChange={onOpenChange}
    title="Calculator keys"
    description="Keys act on the active line when focus is outside the lines."
    size="lg"
  >
    <Stack gap="6">
      <Table<KeyRow>
        caption="Keys"
        captionHidden
        size="sm"
        rows={HELP_KEYS}
        getRowId={(r) => r.action + r.keys.join()}
        columns={[
          {
            key: 'keys',
            header: 'Key',
            width: '12rem',
            cell: (r) => (
              <Inline gap="1" wrap aria-label={r.keys.join(' or ')}>
                {r.keys.map((k) => (
                  <Kbd key={k} keys={combo(k)} />
                ))}
              </Inline>
            ),
          },
          { key: 'action', header: 'Action', cell: (r) => r.action },
        ]}
      />
      <Table<SyntaxRow>
        caption="Sheet syntax"
        size="sm"
        rows={SYNTAX}
        getRowId={(r) => r.example}
        columns={[
          {
            key: 'example',
            header: 'Example',
            width: '12rem',
            cell: (r) => <Text variant="code">{r.example}</Text>,
          },
          { key: 'meaning', header: 'Meaning', cell: (r) => r.meaning },
        ]}
      />
    </Stack>
  </Dialog>
);
