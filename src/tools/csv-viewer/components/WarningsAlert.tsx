import { List, Notice, Stack, Text } from '@arshad-shah/cynosure';
import type { ParseWarning } from '../lib/parse';

const MAX_WARNINGS_SHOWN = 20;

/** Rows that did not parse cleanly, shown anyway. */
export function WarningsAlert({ warnings }: { warnings: ParseWarning[] }) {
  return (
    <Notice
      tone="warning"
      title={`Loaded with ${warnings.length} problem ${warnings.length === 1 ? 'row' : 'rows'}`}
    >
      <Stack gap="2">
        <Text size="sm">
          These rows did not parse cleanly. They are shown anyway: missing cells
          are empty and extra cells are left out. Row numbers count data rows
          after the header.
        </Text>
        <List
          size="sm"
          items={warnings.slice(0, MAX_WARNINGS_SHOWN).map((w) => ({
            id: String(w.row),
            label: `Row ${w.row}: ${w.message}`,
          }))}
        />
        {warnings.length > MAX_WARNINGS_SHOWN && (
          <Text size="sm">{`And ${warnings.length - MAX_WARNINGS_SHOWN} more.`}</Text>
        )}
      </Stack>
    </Notice>
  );
}
