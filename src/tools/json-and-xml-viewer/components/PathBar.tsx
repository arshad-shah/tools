import { CopyButton, Inline, Stack, Text } from '@arshad-shah/cynosure';
import type { DocNode } from '../lib/doc-model';
import { isXmlPath, toDisplayPath, toJsAccessor } from '../lib/paths';
import { nodeValueText, subtreeJson } from '../lib/subtree';

export interface PathBarProps {
  node: DocNode | null;
  value: unknown;
  xml: Document | null;
}

/** The selection's JSONPath or XPath, with copy actions (spec §7.1). */
export function PathBar({ node, value, xml }: PathBarProps) {
  if (!node)
    return (
      <Text size="sm" tone="muted">
        Select a node to see its path
      </Text>
    );
  const xmlDoc = isXmlPath(node.path);
  const path = toDisplayPath(node.path);
  const actions = [
    {
      key: 'path',
      label: xmlDoc ? 'Copy XPath' : 'Copy JSONPath',
      text: () => path,
    },
    ...(xmlDoc
      ? []
      : [
          {
            key: 'accessor',
            label: 'Copy JS accessor',
            text: () => toJsAccessor(node.path),
          },
        ]),
    {
      key: 'value',
      label: 'Copy value',
      text: () => nodeValueText(node, value, xml),
    },
    {
      key: 'subtree',
      label: 'Copy subtree as JSON',
      text: () => subtreeJson(node, value, xml),
    },
  ];
  return (
    <Inline gap="2" align="center" wrap={false}>
      <Stack as="span" role="group" aria-label="Selected path" minSize="0">
        <Text variant="code" size="sm" truncate>
          {path}
        </Text>
      </Stack>
      <Inline gap="1" wrap={false}>
        {actions.map((a) => (
          <CopyButton
            key={a.key}
            size="sm"
            variant="ghost"
            value={a.text}
            labels={{ copy: a.label, copied: 'Copied' }}
          />
        ))}
      </Inline>
    </Inline>
  );
}
