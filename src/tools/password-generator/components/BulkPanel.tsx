import {
  Button,
  CodeBlock,
  CopyButton,
  IconButton,
  Inline,
  Notice,
  NumberField,
  Stack,
} from '@arshad-shah/cynosure';
import { download, refreshCw } from '@arshad-shah/cynosure/icons';
import React, { useState } from 'react';
import { saveBlob } from '@/shared/lib/download';
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
    <Stack gap="4">
      <Inline gap="3" align="end" wrap>
        <NumberField
          label="How many"
          width="sm"
          value={count}
          min={1}
          max={MAX_BULK}
          onChange={(n) => n !== null && onCount(n)}
        />
        <Button variant="soft" icon={refreshCw} onClick={run}>
          Generate list
        </Button>
      </Inline>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {values ? (
        <CodeBlock
          title="Generated list"
          code={values}
          lineNumbers
          copyable={false}
          actions={
            <Inline gap="1">
              <CopyButton
                size="sm"
                value={values}
                labels={{ copy: 'Copy the list' }}
              />
              <IconButton
                size="sm"
                variant="ghost"
                tone="neutral"
                icon={download}
                label="Download passwords.txt"
                onClick={() =>
                  saveBlob(
                    new Blob([values], { type: 'text/plain' }),
                    'passwords.txt',
                  )
                }
              />
            </Inline>
          }
        />
      ) : null}
    </Stack>
  );
};
