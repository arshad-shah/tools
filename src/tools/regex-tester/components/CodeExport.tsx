import React, { useMemo } from 'react';
import { IconCopy } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CodeSurface,
  Inline,
  Select,
  Stack,
} from '@/shared/ui';
import {
  SNIPPET_LANGUAGES,
  toSnippet,
  type SnippetLanguage,
} from '../lib/code';

const ITEMS = SNIPPET_LANGUAGES.map((l) => ({ value: l.id, label: l.label }));

interface CodeExportProps {
  pattern: string;
  flags: string;
  text: string;
  valid: boolean;
  language: SnippetLanguage;
  onLanguageChange(lang: SnippetLanguage): void;
  onCopy(code: string): void;
}

/** A correctly escaped snippet in six languages, with engine warnings. */
export const CodeExport: React.FC<CodeExportProps> = ({
  pattern,
  flags,
  text,
  valid,
  language,
  onLanguageChange,
  onCopy,
}) => {
  const snippet = useMemo(
    () => (valid && pattern ? toSnippet(language, pattern, flags, text) : null),
    [valid, pattern, language, flags, text],
  );

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" gap="2" wrap>
          <CardTitle as="h2">Code</CardTitle>
          <Inline gap="2" align="center">
            <Select
              value={language}
              onValueChange={(v) => onLanguageChange(v as SnippetLanguage)}
              items={ITEMS}
              aria-label="Code language"
              className="h-8 text-sm"
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconCopy size="sm" />}
              disabled={!snippet}
              onClick={() => snippet && onCopy(snippet.code)}
            >
              Copy code
            </Button>
          </Inline>
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          {snippet?.warnings.map((w) => (
            <Alert status="warning" key={w}>
              <AlertDescription>{w}</AlertDescription>
            </Alert>
          ))}
          <CodeSurface
            value={snippet?.code ?? ''}
            language={language === 'js' ? 'js' : 'plain'}
            label="Code snippet"
            readOnly
            placeholder="Enter a valid pattern to get code"
            maxHeight={280}
          />
        </Stack>
      </CardBody>
    </Card>
  );
};
