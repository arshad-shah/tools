import React from 'react';
import { Alert, AlertTitle, Stack, Text } from '@/shared/ui';
import type { ParseWarning } from '../lib/parse';

const MAX_WARNINGS_SHOWN = 20;

export const WarningsAlert: React.FC<{ warnings: ParseWarning[] }> = ({
  warnings,
}) => (
  <Alert status="warning">
    <AlertTitle>
      Loaded with {warnings.length} problem{' '}
      {warnings.length === 1 ? 'row' : 'rows'}
    </AlertTitle>
    <Stack gap="1" className="mt-1">
      <Text size="sm">
        These rows did not parse cleanly. They are shown anyway: missing cells
        are empty and extra cells are left out. Row numbers count data rows
        after the header.
      </Text>
      <ul className="list-disc pl-5 text-sm">
        {warnings.slice(0, MAX_WARNINGS_SHOWN).map((w) => (
          <li key={w.row}>
            Row {w.row}: {w.message}
          </li>
        ))}
      </ul>
      {warnings.length > MAX_WARNINGS_SHOWN && (
        <Text size="sm">And {warnings.length - MAX_WARNINGS_SHOWN} more.</Text>
      )}
    </Stack>
  </Alert>
);
