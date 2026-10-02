import React, { useState } from 'react';
import { IconRefreshCw } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Inline,
  Label,
  NumberInput,
  Stack,
  TextInputPanel,
} from '@/shared/ui';
import { toToolError } from '@/shared/lib/errors';
import { generateBulk, MAX_BULK } from '../lib/passphrase';

interface BulkPanelProps {
  count: number;
  onCount(n: number): void;
  /** Makes one value with the current options (throws when impossible). */
  make(): string;
}

/** 1 to 1,000 values at once: copy all or download a .txt. */
export const BulkPanel: React.FC<BulkPanelProps> = ({
  count,
  onCount,
  make,
}) => {
  const [values, setValues] = useState('');
  const [error, setError] = useState('');
  const run = () => {
    setError('');
    try {
      setValues(generateBulk(count, make).join('\n'));
    } catch (e) {
      setError(toToolError(e).message);
    }
  };
  return (
    <Stack gap="3">
      <Inline gap="2" align="center" wrap>
        <Label htmlFor="bulk-count">How many</Label>
        <NumberInput
          id="bulk-count"
          value={count}
          onValueChange={onCount}
          min={1}
          max={MAX_BULK}
        />
        <Button
          variant="secondary"
          leftIcon={<IconRefreshCw size="sm" />}
          onClick={run}
        >
          Generate list
        </Button>
      </Inline>
      {error && (
        <Alert status="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {values && (
        <div data-dynamic="">
          <TextInputPanel
            label="Generated list"
            value={values}
            onChange={() => {}}
            language="plain"
            readOnly
            downloadName="passwords.txt"
            maxHeight={320}
          />
        </div>
      )}
    </Stack>
  );
};
