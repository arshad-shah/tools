import React from 'react';
import { Select, type SelectGroup } from '@/shared/ui';
import { CATEGORY_LABEL, groupTemplates } from '../lib/templates';
import type { RegexTemplate, TemplateCategory } from '../types';

const GROUPS: SelectGroup[] = (
  Object.entries(groupTemplates()) as Array<[TemplateCategory, RegexTemplate[]]>
).map(([cat, list]) => ({
  label: CATEGORY_LABEL[cat],
  items: list.map((t) => ({ value: t.name, label: t.name })),
}));

const PLACEHOLDER = [{ value: '', label: 'Load a template…' }];

interface TemplatePickerProps {
  value: string;
  onSelect: (name: string) => void;
}

/** Native grouped select of the built-in templates. */
export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  value,
  onSelect,
}) => (
  <div className="min-w-[220px]">
    <Select
      value={value}
      onValueChange={onSelect}
      aria-label="Template"
      items={PLACEHOLDER}
      groups={GROUPS}
      className="h-8 text-sm"
    />
  </div>
);
