import {
  Accordion,
  AccordionItem,
  Badge,
  Card,
  CodeBlock,
  Inline,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { toPem } from '@/shared/lib/crypto/keys';
import type { DecodedItem } from '../lib/decode';
import { linkStatus, utc, validityStatus } from '../lib/status';
import { validity } from '../lib/x509';
import { Asn1View } from './Asn1View';
import { ExtensionList, SanList } from './ExtensionFacts';
import { Facts } from './Facts';

type CertItem = Extract<DecodedItem, { kind: 'certificate' }>;

/** One certificate: status first, then its facts and sections. */
export function CertCard({
  item,
  position,
  now,
}: {
  item: CertItem;
  /** "Certificate 2 of 3", or null when it is the only one. */
  position: string | null;
  now: number;
}) {
  const v = item.view;
  const valid = validityStatus(validity(v, now));
  const link = linkStatus(item.link);
  const bc = v.ext.basicConstraints;
  const role = bc?.ca
    ? v.selfIssued
      ? 'Root CA'
      : 'Intermediate CA'
    : 'End entity';
  return (
    <Card as="section" title={v.title}>
      <Stack gap="5">
        <Inline gap="2" wrap>
          {position ? <Badge tone="neutral">{position}</Badge> : null}
          <Badge tone="accent">{role}</Badge>
          {link && !link.detail ? (
            <Badge tone={link.tone}>{link.label}</Badge>
          ) : null}
        </Inline>
        <Stack gap="3">
          <Notice tone={valid.tone} title={valid.label}>
            {`${valid.detail}: ${utc(v.notBefore)} to ${utc(v.notAfter)}.`}
          </Notice>
          {link && link.detail ? (
            <Notice
              tone={link.tone === 'neutral' ? 'info' : link.tone}
              title={link.label}
            >
              {link.detail}
            </Notice>
          ) : null}
        </Stack>
        <Facts
          label={`Details of ${v.title}`}
          items={[
            { term: 'Subject', value: null, copy: v.subjectText },
            { term: 'Issuer', value: null, copy: v.issuerText },
            { term: 'Serial number', value: null, copy: v.serial },
            { term: 'Valid from', value: utc(v.notBefore) },
            { term: 'Valid until', value: utc(v.notAfter) },
            {
              term: 'Public key',
              value: v.key.exponent
                ? `${v.key.description}, exponent ${v.key.exponent}`
                : v.key.description,
            },
            { term: 'Signature algorithm', value: v.signatureAlgorithm },
            { term: 'Version', value: `X.509 v${v.version}` },
            {
              term: 'SHA-256 fingerprint',
              value: null,
              copy: item.fingerprints.sha256,
            },
            {
              term: 'SHA-1 fingerprint',
              value: null,
              copy: item.fingerprints.sha1,
            },
          ]}
        />
        <Accordion
          type="multiple"
          defaultValue={v.ext.sans.length ? ['sans'] : []}
        >
          <AccordionItem
            value="sans"
            summary={`Subject alternative names (${v.ext.sans.length})`}
          >
            <SanList sans={v.ext.sans} />
          </AccordionItem>
          <AccordionItem
            value="ext"
            summary={`Extensions (${v.ext.all.length})`}
          >
            <ExtensionList ext={v.ext} />
          </AccordionItem>
          <AccordionItem value="names" summary="Subject and issuer attributes">
            <Stack gap="4">
              <Facts
                label="Subject attributes"
                items={v.subject.map((a, i) => ({
                  term: `${a.short}${i ? ` (${i + 1})` : ''}`,
                  value: a.value,
                }))}
              />
              <Text size="sm" weight="medium">
                Issuer
              </Text>
              <Facts
                label="Issuer attributes"
                items={v.issuer.map((a, i) => ({
                  term: `${a.short}${i ? ` (${i + 1})` : ''}`,
                  value: a.value,
                }))}
              />
            </Stack>
          </AccordionItem>
          <AccordionItem value="asn1" summary="ASN.1 structure">
            <Asn1View der={item.der} label={`ASN.1 of ${v.title}`} />
          </AccordionItem>
          <AccordionItem value="pem" summary="PEM">
            <CodeBlock
              title="Certificate PEM"
              code={toPem('CERTIFICATE', item.der)}
              copyable
              size="sm"
              maxLines={8}
            />
          </AccordionItem>
        </Accordion>
      </Stack>
    </Card>
  );
}
