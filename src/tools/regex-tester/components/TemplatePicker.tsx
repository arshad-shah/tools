import React from 'react';
import { IconChevronDown } from '@/shared/ui/icons';

import { CATEGORY_LABEL, groupTemplates } from '../lib/templates';
import type { RegexTemplate, TemplateCategory } from '../types';

const GROUPED_TEMPLATES = groupTemplates();

interface TemplatePickerProps {
  value: string;
  onSelect: (name: string) => void;
}

/** Native grouped select of the built-in templates. */
export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  value,
  onSelect,
}) => (
  <div className="relative min-w-[220px]">
    <select
      value={value}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="Template"
      className="h-8 w-full appearance-none rounded-md border border-line bg-surface pl-3 pr-9 text-sm text-fg transition-colors focus:border-accent focus:outline-none"
    >
      <option value="">Load a template…</option>
      {(
        Object.entries(GROUPED_TEMPLATES) as Array<
          [TemplateCategory, RegexTemplate[]]
        >
      ).map(([cat, list]) => (
        <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
          {list.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
    <IconChevronDown
      size="sm"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle"
    />
  </div>
);
