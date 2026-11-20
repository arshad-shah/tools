import {
  Inline,
  Stack,
  Text,
  Tree,
  type TreeItem,
} from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import { asn1Tree, NODE_CAP, type Asn1Node } from '../lib/asn1-tree';

const toItems = (nodes: Asn1Node[]): TreeItem<Asn1Node>[] =>
  nodes.map((n) => ({
    id: n.id,
    label: n.value ? `${n.label} ${n.value}` : n.label,
    data: n,
    ...(n.children ? { children: toItems(n.children) } : {}),
  }));

/** The raw ASN.1 structure as a keyboard-navigable tree. */
export function Asn1View({ der, label }: { der: Uint8Array; label: string }) {
  const tree = useMemo(() => asn1Tree(der), [der]);
  const items = useMemo(() => (tree ? toItems(tree.root) : []), [tree]);
  if (!tree) return <Text tone="muted">The bytes are not valid ASN.1.</Text>;
  return (
    <Stack gap="2">
      {tree.truncated ? (
        <Text size="sm" tone="muted">
          {`Only the first ${NODE_CAP} nodes are shown.`}
        </Text>
      ) : null}
      <Tree
        label={label}
        size="sm"
        items={items}
        defaultExpanded={['0', '0.0']}
        renderLabel={(item) => (
          <Inline gap="2" as="span" wrap={false}>
            <Text as="span" size="sm" weight="medium">
              {item.data?.label}
            </Text>
            {item.data?.value ? (
              <Text as="span" size="sm" variant="code" tone="muted" truncate>
                {item.data.value}
              </Text>
            ) : null}
          </Inline>
        )}
      />
    </Stack>
  );
}
