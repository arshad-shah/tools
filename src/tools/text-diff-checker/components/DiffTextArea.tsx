import React from 'react';
import {
  IconCopy,
  IconFileUp,
  IconRotateCcw,
  IconSparkles,
} from '@/shared/ui/icons';

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  IconButton,
  Inline,
  Textarea,
} from '@/shared/ui';

interface DiffTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
  onFileUpload?: () => void;
  onCopy?: () => void;
  onClear?: () => void;
}

export const DiffTextArea: React.FC<DiffTextAreaProps> = ({
  value,
  onChange,
  placeholder,
  label,
  disabled,
  onFileUpload,
  onCopy,
  onClear,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center" wrap gap="2">
        <Inline align="center" gap="2">
          <IconSparkles size="sm" />
          <CardTitle as="h3">{label}</CardTitle>
        </Inline>
        <Inline gap="1">
          {onFileUpload && (
            <IconButton
              variant="ghost"
              size="sm"
              label="Upload file"
              disabled={disabled}
              icon={<IconFileUp size="sm" />}
              onClick={onFileUpload}
            />
          )}
          {onCopy && (
            <IconButton
              variant="ghost"
              size="sm"
              label="Copy"
              disabled={!value || disabled}
              icon={<IconCopy size="sm" />}
              onClick={onCopy}
            />
          )}
          {onClear && (
            <IconButton
              variant="ghost"
              size="sm"
              label="Clear"
              disabled={!value || disabled}
              icon={<IconRotateCcw size="sm" />}
              onClick={onClear}
            />
          )}
        </Inline>
      </Inline>
    </CardHeader>
    <CardBody>
      <Textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={12}
        spellCheck={false}
        aria-label={label}
      />
    </CardBody>
  </Card>
);
