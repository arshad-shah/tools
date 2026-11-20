import { Badge, Inline, Stack, Text } from '@arshad-shah/cynosure';
import type { ExtensionsView } from '../lib/extensions';
import { CodeList, Facts, type Fact } from './Facts';

/** Subject alternative names grouped by type. */
export function SanList({ sans }: { sans: ExtensionsView['sans'] }) {
  if (!sans.length)
    return <Text tone="muted">No subject alternative names.</Text>;
  return (
    <Stack gap="2">
      {sans.map((s, i) => (
        <Inline key={i} gap="2" align="center" wrap>
          <Badge size="sm" tone="neutral">
            {s.type}
          </Badge>
          <Text as="span" variant="code" wrap="break">
            {s.value}
          </Text>
        </Inline>
      ))}
    </Stack>
  );
}

/** Usages, constraints, identifiers, URLs and policies as facts. */
function extensionFacts(ext: ExtensionsView): Fact[] {
  const items: Fact[] = [];
  if (ext.basicConstraints)
    items.push({
      term: 'Basic constraints',
      value: ext.basicConstraints.ca
        ? `Certificate authority${ext.basicConstraints.pathLen !== null ? `, at most ${ext.basicConstraints.pathLen} intermediate${ext.basicConstraints.pathLen === 1 ? '' : 's'} below` : ''}`
        : 'Not a certificate authority',
    });
  if (ext.keyUsage.length)
    items.push({ term: 'Key usage', value: ext.keyUsage.join(', ') });
  if (ext.extKeyUsage.length)
    items.push({
      term: 'Extended key usage',
      value: (
        <Stack gap="1">
          {ext.extKeyUsage.map((e) => (
            <Text key={e} as="span">
              {e}
            </Text>
          ))}
        </Stack>
      ),
    });
  if (ext.subjectKeyId)
    items.push({ term: 'Subject key ID', value: null, copy: ext.subjectKeyId });
  if (ext.authorityKeyId)
    items.push({
      term: 'Authority key ID',
      value: null,
      copy: ext.authorityKeyId,
    });
  for (const a of ext.aia)
    items.push({ term: a.method, value: <CodeList values={[a.location]} /> });
  if (ext.crl.length)
    items.push({
      term: 'CRL distribution points',
      value: <CodeList values={ext.crl} />,
    });
  if (ext.policies.length)
    items.push({
      term: 'Policies',
      value: (
        <Stack gap="1">
          {ext.policies.map((p) => (
            <Text key={p.oid} as="span">
              {p.name === p.oid ? p.oid : `${p.name} (${p.oid})`}
            </Text>
          ))}
        </Stack>
      ),
    });
  return items;
}

/** Every extension by name, with criticality. */
export function ExtensionList({ ext }: { ext: ExtensionsView }) {
  if (!ext.all.length) return <Text tone="muted">No extensions.</Text>;
  return (
    <Stack gap="4">
      <Facts label="Extension details" items={extensionFacts(ext)} />
      <Stack gap="2">
        <Text size="sm" weight="medium">
          {`All extensions (${ext.all.length})`}
        </Text>
        {ext.all.map((e) => (
          <Inline key={e.oid} gap="2" align="center" wrap>
            <Text as="span">{e.name}</Text>
            {e.known ? (
              <Text as="span" size="sm" tone="muted" variant="code">
                {e.oid}
              </Text>
            ) : null}
            {e.critical ? (
              <Badge size="sm" tone="warning">
                Critical
              </Badge>
            ) : null}
          </Inline>
        ))}
      </Stack>
      {ext.aia.length || ext.crl.length ? (
        <Text size="sm" tone="muted">
          URLs are shown as text and never fetched: revocation is not checked.
        </Text>
      ) : null}
    </Stack>
  );
}
