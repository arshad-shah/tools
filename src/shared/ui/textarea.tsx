import React from 'react';
import { TextArea } from '@arshad-shah/cynosure';
import { MONO_FIELD, fieldClass, useFieldElement } from './field-props';

interface TextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange' | 'value' | 'defaultValue' | 'children'
> {
  value: string;
  onChange?: (value: string) => void;
}

/**
 * A multi-line monospace field over Cynosure's TextArea: it starts at
 * `rows`, grows with its content (to at least 12 rows) and has a resize
 * grip. Named by `aria-label` or a separate `<Label htmlFor={id}>`.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      style,
      value,
      onChange,
      rows,
      'aria-describedby': describedBy,
      ...props
    },
    ref,
  ) => {
    const areaRef = useFieldElement(ref, describedBy);
    const { layout } = fieldClass(className);
    return (
      <TextArea
        ref={areaRef}
        {...props}
        label={props['aria-label'] ?? ''}
        labelHidden
        value={value}
        onChange={onChange}
        rows={rows}
        maxRows={Math.max(rows ?? 3, 12)}
        className={layout}
        style={{ ...MONO_FIELD, ...style }}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
