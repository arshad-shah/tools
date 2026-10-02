import { useMemo, useState } from 'react';
import { useClipboard } from '@/shared/lib/clipboard';
import {
  Button,
  CodeSurface,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Inline,
  Label,
  Select,
  Stack,
  Switch,
} from '@/shared/ui';
import { IconCopy } from '@/shared/ui/icons';
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
  const { copiedKey, copy } = useClipboard();
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
            <Inline gap="2" align="center">
              <Switch
                id="snippet-values"
                checked={withValues}
                onCheckedChange={setWithValues}
              />
              <Label htmlFor="snippet-values">Include variable values</Label>
            </Inline>
          </Inline>
          <CodeSurface
            label="Snippet"
            language="plain"
            value={code}
            readOnly
            wrap
            maxHeight={360}
          />
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button
          variant="secondary"
          leftIcon={<IconCopy size="sm" />}
          onClick={() => void copy(code, 'code')}
        >
          {copiedKey === 'code' ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
