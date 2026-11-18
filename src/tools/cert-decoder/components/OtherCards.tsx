import {
  Accordion,
  AccordionItem,
  Badge,
  Card,
  Inline,
  List,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { ProductionUseNotice } from '@/app/ui/production-use';
import type { DecodedItem } from '../lib/decode';
import { linkStatus, signatureStatus } from '../lib/status';
import { Asn1View } from './Asn1View';
import { ExtensionList, SanList } from './ExtensionFacts';
import { Facts } from './Facts';

type Of<K extends DecodedItem['kind']> = Extract<DecodedItem, { kind: K }>;

/** A certificate signing request: who it is for and what it asks for. */
export function CsrCard({ item }: { item: Of<'csr'> }) {
  const v = item.view;
  const sig = signatureStatus(item.signature);
  return (
    <Card as="section" title="Certificate signing request">
      <Stack gap="5">
        <Inline gap="2" wrap>
          <Badge tone="accent">CSR</Badge>
          <Badge tone={sig.tone}>{sig.label}</Badge>
        </Inline>
        <Notice tone={sig.tone} title={sig.label}>
          {`${sig.detail}. A request is signed with its own key, which proves the requester holds it.`}
        </Notice>
        <Facts
          label="Request details"
          items={[
            { term: 'Subject', value: null, copy: v.subjectText || '(empty)' },
            {
              term: 'Public key',
              value: v.key.exponent
                ? `${v.key.description}, exponent ${v.key.exponent}`
                : v.key.description,
            },
            { term: 'Signature algorithm', value: v.signatureAlgorithm },
            {
              term: 'SHA-256 of the request',
              value: null,
              copy: item.fingerprints.sha256,
            },
            ...(v.attributes.length
              ? [{ term: 'Other attributes', value: v.attributes.join(', ') }]
              : []),
          ]}
        />
        <Accordion
          type="multiple"
          defaultValue={v.ext.sans.length ? ['sans'] : []}
        >
          <AccordionItem
            value="sans"
            summary={`Requested names (${v.ext.sans.length})`}
          >
            <SanList sans={v.ext.sans} />
          </AccordionItem>
          <AccordionItem
            value="ext"
            summary={`Requested extensions (${v.ext.all.length})`}
          >
            <ExtensionList ext={v.ext} />
          </AccordionItem>
          <AccordionItem value="asn1" summary="ASN.1 structure">
            <Asn1View der={item.der} label="ASN.1 of the request" />
          </AccordionItem>
        </Accordion>
      </Stack>
    </Card>
  );
}

/** A public key block. */
export function PublicKeyCard({ item }: { item: Of<'public-key'> }) {
  const k = item.key;
  return (
    <Card as="section" title="Public key">
      <Stack gap="4">
        <Facts
          label="Public key details"
          items={[
            { term: 'Block', value: item.label || 'Bare DER' },
            { term: 'Algorithm', value: k.description },
            ...(k.bits ? [{ term: 'Size', value: `${k.bits} bits` }] : []),
            ...(k.exponent ? [{ term: 'Exponent', value: k.exponent }] : []),
            { term: 'Algorithm OID', value: k.oid },
          ]}
        />
        <Accordion type="multiple">
          <AccordionItem value="asn1" summary="ASN.1 structure">
            <Asn1View der={item.der} label="ASN.1 of the public key" />
          </AccordionItem>
        </Accordion>
      </Stack>
    </Card>
  );
}

/** A private key: only its kind and size, never its value. */
export function PrivateKeyCard({ item }: { item: Of<'private-key'> }) {
  const s = item.summary;
  return (
    <Card as="section" title="Private key">
      <Stack gap="4">
        <Facts
          label="Private key details"
          items={[
            { term: 'Format', value: s.format },
            {
              term: 'Algorithm',
              value: s.encrypted
                ? 'Hidden by the encryption'
                : (s.key?.description ?? 'Unknown'),
            },
            ...(s.key?.bits
              ? [{ term: 'Size', value: `${s.key.bits} bits` }]
              : []),
          ]}
        />
        <ProductionUseNotice
          title="This is a private key"
          commandsLabel="Inspect a key on your own machine"
          commands={[
            {
              label: 'Key type and size, without printing the key',
              command: "openssl pkey -in key.pem -noout -text | sed -n '1p'",
            },
          ]}
        >
          It was read only in this browser and is not stored or sent anywhere.
          Only its type and size are shown. Clear the input when you are done.
          Do not paste production private keys into any web page; inspect those
          locally.
        </ProductionUseNotice>
      </Stack>
    </Card>
  );
}

export function ErrorCard({ item }: { item: Of<'error'> }) {
  return (
    <Notice tone="danger" title={`${item.label} could not be decoded`}>
      {item.message}
    </Notice>
  );
}

/** The certificates in the order given, and how each links to the next. */
export function ChainSummary({ certs }: { certs: Of<'certificate'>[] }) {
  return (
    <Card as="section" title={`Chain of ${certs.length} certificates`}>
      <Stack gap="3">
        <Text tone="muted">
          In the order pasted, leaf first: each certificate should be issued by
          the next one. Trust in a root is not judged here.
        </Text>
        <List
          label="Certificates in order"
          marker="number"
          items={certs.map((c, i) => {
            const s = linkStatus(c.link);
            return {
              id: String(i),
              label: (
                <Inline gap="2" align="center" wrap as="span">
                  <Text as="span" weight="medium">
                    {c.view.title}
                  </Text>
                  {s ? (
                    <Badge size="sm" tone={s.tone}>
                      {s.label}
                    </Badge>
                  ) : null}
                </Inline>
              ),
              description: `Issued by ${c.view.issuerText}`,
            };
          })}
        />
      </Stack>
    </Card>
  );
}
