import { useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Inline,
  Label,
  Select,
  Stack,
  SwitchField,
  TextInputPanel,
} from '@/shared/ui';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Code snippet</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <Stack gap="3">
          <Inline gap="3" align="end" wrap>
            <Stack gap="1">
              <Label htmlFor="snippet-lang">Language</Label>
              <Select
                id="snippet-lang"
                value={lang}
                onValueChange={(v) => setLang(v as SnippetLang)}
                items={SNIPPET_LANGS.map((l) => ({
                  value: l.id,
                  label: l.label,
                }))}
              />
            </Stack>
            <SwitchField
              label="Include variable values"
              checked={withValues}
              onCheckedChange={setWithValues}
            />
          </Inline>
          <TextInputPanel
            label="Snippet"
            language="plain"
            value={code}
            onChange={() => {}}
            readOnly
            wrap
            maxHeight={360}
          />
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
