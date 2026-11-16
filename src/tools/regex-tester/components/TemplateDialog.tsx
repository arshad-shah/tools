import React, { useMemo, useState } from 'react';
import {
  Dialog,
  EmptyState,
  ListRow,
  ListRows,
  SearchField,
  Stack,
} from '@arshad-shah/cynosure';
import { CATEGORY_LABEL, searchTemplates } from '../lib/templates';
import type { RegexTemplate, TemplateCategory } from '../types';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onPick(template: RegexTemplate): void;
}

/** Searchable template library; picking one loads pattern, flags and samples. */
export const TemplateDialog: React.FC<TemplateDialogProps> = ({
  open,
  onOpenChange,
  onPick,
}) => {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const found = searchTemplates(query);
    return (Object.keys(CATEGORY_LABEL) as TemplateCategory[])
      .map((cat) => ({ cat, list: found.filter((t) => t.category === cat) }))
      .filter((g) => g.list.length > 0);
  }, [query]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Template library"
    >
      <Stack gap="5">
        <SearchField
          label="Search templates"
          labelHidden
          placeholder="Search by name, description or pattern"
          value={query}
          onChange={setQuery}
        />
        {groups.length === 0 ? (
          <EmptyState size="sm" title="No templates match this search" />
        ) : null}
        {groups.map(({ cat, list }) => (
          <ListRows key={cat} label={CATEGORY_LABEL[cat]} size="sm" divided>
            {list.map((t) => (
              <ListRow
                key={t.name}
                label={t.name}
                description={t.description}
                detail={t.pattern}
                mono="detail"
                trailing={CATEGORY_LABEL[cat]}
                onClick={() => {
                  onPick(t);
                  onOpenChange(false);
                }}
              />
            ))}
          </ListRows>
        ))}
      </Stack>
    </Dialog>
  );
};
