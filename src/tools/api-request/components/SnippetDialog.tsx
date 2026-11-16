import {
  CodeBlock,
  Dialog,
  Grid,
  Select,
  Stack,
  Switch,
} from '@arshad-shah/cynosure';
import { useMemo, useState } from 'react';
import type { HttpRequest } from '../lib/model';
import { SNIPPET_LANGS, toSnippet, type SnippetLang } from '../lib/snippets';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  request: HttpRequest;
  vars: Record<string, string>;
}

/** The request as cURL, fetch, axios, Python, HTTPie or Node code. */
export function SnippetDialog({ open, onOpenChange, request, vars }: Props) {
  const [lang, setLang] = useState<SnippetLang>('curl');
  const [withValues, setWithValues] = useState(false);
  const code = useMemo(
    () => (open ? toSnippet(request, lang, withValues ? { vars } : {}) : ''),
    [open, request, lang, withValues, vars],
  );
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Code snippet"
      size="lg"
    >
      <Stack gap="4">
        <Grid columns={{ base: 1, sm: 2 }} gap="4" align="end">
          <Select
            label="Language"
            value={lang}
            onChange={(v) => setLang(v as SnippetLang)}
            options={SNIPPET_LANGS.map((l) => ({
              value: l.id,
              label: l.label,
            }))}
          />
          <Switch
            label="Include variable values"
            checked={withValues}
            onChange={setWithValues}
          />
        </Grid>
        <CodeBlock title="Snippet" code={code} wrap />
      </Stack>
    </Dialog>
  );
}
