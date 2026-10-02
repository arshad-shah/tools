import React from 'react';
import rehypePrism from 'rehype-prism-plus';
import rehypeRewrite, { type RehypeRewriteOptions } from 'rehype-rewrite';
import { IconCodeXml, IconFileJson } from '@/shared/ui/icons';

import {
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Inline,
} from '@/shared/ui';
import {
  CodeEditor,
  type CodeEditorProps,
} from '@/shared/ui/adapters/CodeEditor';
import type { FormatType } from '../types';

type RehypePlugins = CodeEditorProps['rehypePlugins'];
type RewriteNode = Parameters<RehypeRewriteOptions['rewrite']>[0];

interface EditorPaneProps {
  inputText: string;
  setInputText: (text: string) => void;
  format: FormatType;
  highlightedLines: number[];
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  inputText,
  setInputText,
  format,
  highlightedLines,
}) => {
  const rehypePlugins: RehypePlugins = [
    [rehypePrism, { ignoreMissing: true }],
    [
      rehypeRewrite,
      {
        rewrite: (node: RewriteNode, index: number) => {
          const className =
            node.type === 'element' ? node.properties?.className : undefined;
          if (Array.isArray(className) && className.includes('code-line')) {
            const lineNumber = index + 1;
            if (highlightedLines.includes(lineNumber)) {
              // A class, not a style object: hast stringified the old object
              // to style="[object Object]", so matches were never highlighted.
              className.push('highlighted-line', 'bg-info/20');
            }
          }
        },
      },
    ],
  ];

  const renderEditor = () => (
    <CodeEditor
      value={inputText}
      language={format}
      placeholder={`Enter ${format.toUpperCase()} here…`}
      onChange={setInputText}
      label={`${format.toUpperCase()} input`}
      className="min-h-96"
      rehypePlugins={rehypePlugins}
    />
  );

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline align="center" gap="2">
            {format === 'json' ? (
              <IconFileJson size="sm" />
            ) : (
              <IconCodeXml size="sm" />
            )}
            <Heading level={3} size="md">
              {format.toUpperCase()} editor
            </Heading>
          </Inline>
          {highlightedLines.length > 0 && (
            <Badge variant="soft" tone="accent" size="sm">
              {highlightedLines.length} match
              {highlightedLines.length !== 1 ? 'es' : ''}
            </Badge>
          )}
        </Inline>
      </CardHeader>
      <CardBody>
        <Box className="overflow-auto">{renderEditor()}</Box>
      </CardBody>
    </Card>
  );
};
