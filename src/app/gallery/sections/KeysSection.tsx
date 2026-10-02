import { Kbd, ShortcutHint, Stack, Text } from '@/shared/ui';
import { Row, Section } from '../Section';

const COMBOS = [
  'Mod+K',
  'Mod+Shift+Z',
  'Alt+ArrowUp',
  'Ctrl+Enter',
  'Shift+Tab',
  'Escape',
  'Backspace',
  'ArrowLeft',
  'ArrowRight',
  'ArrowDown',
  '?',
  'p',
];

export function KeysSection() {
  return (
    <Section name="keys" title="Keys">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3">
        {COMBOS.map((c) => (
          <Stack
            key={c}
            gap="1"
            className="rounded-md bg-surface p-3 shadow-e1"
          >
            <Kbd keys={c} size="md" />
            <Text size="xs" tone="subtle" mono>
              {c}
            </Text>
          </Stack>
        ))}
      </div>
      <Row label="ShortcutHint">
        <Text size="sm">
          Open the palette <ShortcutHint keys="Mod+K" className="ml-2" />
        </Text>
        <Text size="sm">
          Redo <ShortcutHint keys="Mod+Shift+Z" className="ml-2" />
        </Text>
      </Row>
    </Section>
  );
}
