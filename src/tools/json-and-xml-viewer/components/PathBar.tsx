import {
  CopyButton,
  IconButton,
  Inline,
  Menu,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { moreHorizontal } from '@arshad-shah/cynosure/icons';
import { copyText } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import type { DocNode } from '../lib/doc-model';
import { isXmlPath, toDisplayPath, toJsAccessor } from '../lib/paths';
import { nodeValueText, subtreeJson } from '../lib/subtree';

export interface PathBarProps {
  node: DocNode | null;
  value: unknown;
  xml: Document | null;
}

/**
 * The selection's JSONPath or XPath with one Copy button; the other copies
 * (JS accessor, value, subtree as JSON) are in a menu beside it (spec §7.1).
 */
export function PathBar({ node, value, xml }: PathBarProps) {
  if (!node)
    return (
      <Text size="sm" tone="muted">
        Select a node to see its path
      </Text>
    );
  const xmlDoc = isXmlPath(node.path);
  const path = toDisplayPath(node.path);
  const more = [
    ...(xmlDoc
      ? []
      : [
          {
            value: 'accessor',
            label: 'Copy JS accessor',
            text: () => toJsAccessor(node.path),
          },
        ]),
    {
      value: 'value',
      label: 'Copy value',
      text: () => nodeValueText(node, value, xml),
    },
    {
      value: 'subtree',
      label: 'Copy subtree as JSON',
      text: () => subtreeJson(node, value, xml),
    },
  ];
  const copyMore = (v: string) => {
    const item = more.find((m) => m.value === v);
    if (!item) return;
    try {
      void copyText(item.text()).then(
        () => notify.success('Copied'),
        (e: unknown) => notify.error(toToolError(e)),
      );
    } catch (e) {
      notify.error(toToolError(e));
    }
  };
  return (
    <Inline gap="2" align="center" wrap={false}>
      <Stack as="span" role="group" aria-label="Selected path" minSize="0">
        <Text variant="code" size="sm" truncate>
          {path}
        </Text>
      </Stack>
      <Inline gap="1" wrap={false}>
        <CopyButton
          size="sm"
          variant="ghost"
          value={() => path}
          labels={{
            copy: xmlDoc ? 'Copy XPath' : 'Copy JSONPath',
            copied: 'Copied',
          }}
        />
        <Menu
          label="More copy options"
          items={more.map(({ value: v, label }) => ({ value: v, label }))}
          onSelect={copyMore}
          trigger={(props) => (
            <IconButton
              {...props}
              size="sm"
              variant="ghost"
              label="More copy options"
              icon={moreHorizontal}
            />
          )}
        />
      </Inline>
    </Inline>
  );
}
