import React, { useMemo } from 'react';
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Select,
  Stack,
  TextInputPanel,
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
}

/** A correctly escaped snippet in six languages, with engine warnings. */
export const CodeExport: React.FC<CodeExportProps> = ({
  pattern,
  flags,
  text,
  valid,
  language,
  onLanguageChange,
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
          <Select
            value={language}
            onValueChange={(v) => onLanguageChange(v as SnippetLanguage)}
            items={ITEMS}
            aria-label="Code language"
            size="sm"
          />
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="3">
          {snippet?.warnings.map((w) => (
            <Alert status="warning" size="sm" key={w}>
              {w}
            </Alert>
          ))}
          <TextInputPanel
            value={snippet?.code ?? ''}
            onChange={() => {}}
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
