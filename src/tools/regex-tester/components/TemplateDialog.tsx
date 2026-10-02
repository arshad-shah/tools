import React, { useMemo, useState } from 'react';
import {
  Button,
  Code,
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
  SearchInput,
  Stack,
  Text,
} from '@/shared/ui';
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
    <Dialog open={open} onOpenChange={onOpenChange} size="lg">
      <DialogHeader>
        <DialogTitle>Template library</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <Stack gap="4">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name, description or pattern"
            aria-label="Search templates"
            prompt=""
          />
          {groups.length === 0 && (
            <Text size="sm" tone="subtle">
              No templates match this search.
            </Text>
          )}
          {groups.map(({ cat, list }) => (
            <Stack gap="1" key={cat}>
              <Text size="sm" weight="semibold">
                {CATEGORY_LABEL[cat]}
              </Text>
              {list.map((t) => (
                <Button
                  key={t.name}
                  variant="ghost"
                  size="sm"
                  fullWidth
                  className="h-auto justify-start py-2 text-left"
                  onClick={() => {
                    onPick(t);
                    onOpenChange(false);
                  }}
                >
                  <Stack gap="1" className="min-w-0">
                    <Text as="span" size="sm" weight="medium">
                      {t.name}
                    </Text>
                    <Text as="span" size="xs" tone="subtle">
                      {t.description}
                    </Text>
                    <Code className="truncate">{t.pattern}</Code>
                  </Stack>
                </Button>
              ))}
            </Stack>
          ))}
        </Stack>
      </DialogBody>
    </Dialog>
  );
};
