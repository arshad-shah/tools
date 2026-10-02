import { useClipboard } from '@/shared/lib/clipboard';
import {
  IconBraces,
  IconCheck,
  IconCode,
  IconCopy,
  IconFileJson,
} from '@/shared/ui/icons';
import { Code, IconButton, Inline, Text, Tooltip } from '@/shared/ui';
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
  const { copy, copiedKey } = useClipboard();
  if (!node)
    return (
      <Text size="sm" tone="muted" className="px-1 py-1.5">
        Select a node to see its path
      </Text>
    );
  const xmlDoc = isXmlPath(node.path);
  const path = toDisplayPath(node.path);
  const actions = [
    {
      key: 'path',
      label: xmlDoc ? 'Copy XPath' : 'Copy JSONPath',
      icon: IconCopy,
      text: () => path,
    },
    ...(xmlDoc
      ? []
      : [
          {
            key: 'accessor',
            label: 'Copy JS accessor',
            icon: IconCode,
            text: () => toJsAccessor(node.path),
          },
        ]),
    {
      key: 'value',
      label: 'Copy value',
      icon: IconBraces,
      text: () => nodeValueText(node, value, xml),
    },
    {
      key: 'subtree',
      label: 'Copy subtree as JSON',
      icon: IconFileJson,
      text: () => subtreeJson(node, value, xml),
    },
  ];
  return (
    <Inline
      gap="2"
      className="min-w-0 rounded-md border border-line bg-surface-2 px-2 py-1"
    >
      <Code
        className="min-w-0 flex-1 truncate bg-transparent"
        aria-label="Selected path"
        title={path}
      >
        {path}
      </Code>
      <Inline gap="1">
        {actions.map((a) => (
          <Tooltip key={a.key} content={a.label}>
            <IconButton
              label={a.label}
              icon={copiedKey === a.key ? IconCheck : a.icon}
              size="sm"
              variant="ghost"
              onClick={() => void copy(a.text(), a.key)}
            />
          </Tooltip>
        ))}
      </Inline>
    </Inline>
  );
}
