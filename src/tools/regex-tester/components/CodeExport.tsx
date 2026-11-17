import React, { useMemo } from 'react';
import { Card, CodeBlock, Notice, Select, Stack } from '@arshad-shah/cynosure';
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
    <Card
      as="section"
      title="Code"
      headingLevel={2}
      actions={
        <Select
          label="Code language"
          labelHidden
          size="sm"
          value={language}
          onChange={(v) => onLanguageChange(v as SnippetLanguage)}
          options={ITEMS}
        />
      }
    >
      <Stack gap="4">
        {snippet?.warnings.map((w) => (
          <Notice tone="warning" size="sm" key={w}>
            {w}
          </Notice>
        ))}
        <CodeBlock
          title="Code snippet"
          code={snippet?.code ?? 'Enter a valid pattern to get code'}
          language={language === 'js' ? 'javascript' : undefined}
          copyable={!!snippet}
        />
      </Stack>
    </Card>
  );
};
