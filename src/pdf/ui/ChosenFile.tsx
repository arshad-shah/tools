import {
  Button,
  Card,
  IconTile,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { fileText } from '@arshad-shah/cynosure/icons';
import { formatBytes } from '@/shared/lib/format';

/**
 * The one file a single-file tool works on, with what is known about it and
 * a way back to step 1.
 */
export function ChosenFile({
  name,
  size,
  detail,
  onClear,
  disabled,
}: {
  name: string;
  size: number;
  /** "12 pages", "Opening", ... */
  detail?: string | undefined;
  onClear(): void;
  disabled?: boolean;
}) {
  return (
    <Card padding="md" as="section" aria-label="Chosen file">
      <Inline gap="5" align="center" justify="between" wrap>
        <Inline gap="4" align="center" minSize="0">
          <IconTile icon={fileText} tone="neutral" />
          <Stack gap="1" minSize="0">
            <Text weight="medium" truncate>
              {name}
            </Text>
            <Text size="sm" tone="muted">
              {[detail, formatBytes(size)].filter(Boolean).join(', ')}
            </Text>
          </Stack>
        </Inline>
        <Button variant="ghost" size="sm" disabled={disabled} onClick={onClear}>
          Choose another file
        </Button>
      </Inline>
    </Card>
  );
}
