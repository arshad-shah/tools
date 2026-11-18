import { Inline, Kbd, Text } from '@arshad-shah/cynosure';

/** "Press n and p to move between changes." */
export function NavHint() {
  return (
    <Inline gap="2" align="center" wrap>
      <Text size="sm" tone="muted">
        Press
      </Text>
      <Kbd keys="n" size="sm" />
      <Text size="sm" tone="muted">
        and
      </Text>
      <Kbd keys="p" size="sm" />
      <Text size="sm" tone="muted">
        to move between changes.
      </Text>
    </Inline>
  );
}
