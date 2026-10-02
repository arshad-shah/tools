import React from 'react';
import { Inline, Label, Select, Text } from '@/shared/ui';
import {
  DELIMITER_LABEL,
  DELIMITERS,
  type Delimiter,
  type DelimiterChoice,
} from '../lib/parse';

const DELIMITER_ITEMS = [
  { value: 'auto', label: 'Auto-detect' },
  ...DELIMITERS.map((d) => ({ value: d, label: DELIMITER_LABEL[d] })),
];

interface DelimiterControlProps {
  value: DelimiterChoice;
  onChange: (value: string) => void;
  /** The delimiter of the shown table, if one is shown. */
  detected: Delimiter | null;
}

export const DelimiterControl: React.FC<DelimiterControlProps> = ({
  value,
  onChange,
  detected,
}) => (
  <Inline gap="2" align="center" wrap>
    <Label htmlFor="csv-delimiter">Delimiter</Label>
    <div className="w-40">
      <Select
        id="csv-delimiter"
        value={value}
        onValueChange={onChange}
        items={DELIMITER_ITEMS}
      />
    </div>
    {detected && value === 'auto' && (
      <Text size="sm" tone="subtle">
        Detected: {DELIMITER_LABEL[detected]}
      </Text>
    )}
  </Inline>
);
