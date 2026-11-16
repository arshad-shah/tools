import { useState } from 'react';
import {
  signatureBroken,
  signatureUnknown,
  signatureVerified,
} from '@arshad-shah/cynosure/icons';
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { ErrorNotice, LoadingLine } from '../../ui/states';
import type { SignatureReport } from '@/pdf/sign/pades/verify';
import type { DocumentSignatures } from '../../signatures';
import { CertificateDetails } from './cert-meta';
import { timeSourceText } from './signature-labels';
import { TrustedRootsDialog } from './TrustedRootsDialog';

const when = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'long',
        timeStyle: 'long',
      }).format(d)
    : 'No signing time';

/** Broken unless intact and valid; verified only when trusted. */
function iconFor(r: SignatureReport) {
  if (r.integrity !== 'intact' || !r.signatureValid || !r.signer)
    return {
      icon: signatureBroken,
      tone: 'danger' as const,
      label: 'Invalid signature',
    };
  if (r.trust === 'trusted')
    return {
      icon: signatureVerified,
      tone: 'success' as const,
      label: 'Trusted signature',
    };
  return {
    icon: signatureUnknown,
    tone: 'warning' as const,
    label: 'Signer not verified',
  };
}

function SignatureCard({ r }: { r: SignatureReport }) {
  const { icon, tone, label } = iconFor(r);
  return (
    <Card as="li" variant="outline" padding="md">
      <Stack gap="3">
        <Inline gap="3" align="start">
          <Icon icon={icon} size="md" tone={tone} label={label} />
          <Stack gap="1" minSize="0">
            <Text size="sm" weight="medium">
              {r.signer?.subjectCN || r.fieldName}
            </Text>
            <Text as="p" size="sm">
              {r.summary}
            </Text>
          </Stack>
        </Inline>
        <Text size="sm" tone="muted">
          {[
            when(r.time.value),
            timeSourceText(r),
            r.coverage === 'whole-document'
              ? 'Covers the whole document'
              : 'Document changed after signing',
          ].join('. ')}
        </Text>
        {r.notes.length || r.problems.length ? (
          <Stack gap="1">
            {r.notes.map((n, i) => (
              <Text key={`n${i}`} as="p" size="sm" tone="muted">
                {n}
              </Text>
            ))}
            {r.problems.map((p, i) => (
              <Text key={`p${i}`} as="p" size="sm" tone="danger">
                {p}
              </Text>
            ))}
          </Stack>
        ) : null}
        {r.signer ? (
          <Disclosure summary="Show certificate" variant="plain" size="sm">
            <Stack gap="3">
              {r.chain.map((c, i) => (
                <Stack key={`${i}-${c.sha256}`} gap="1">
                  {r.chain.length > 1 ? (
                    <Text size="sm" tone="muted">
                      {i === 0 ? 'Signer' : `Issuer ${i}`}
                    </Text>
                  ) : null}
                  <CertificateDetails info={c} />
                </Stack>
              ))}
            </Stack>
          </Disclosure>
        ) : null}
      </Stack>
    </Card>
  );
}

/**
 * "Signatures in this document" (plan H-14): one card per signature with
 * honest trust labels; trusted roots can be imported from here.
 */
export function SignaturesPanel({
  signatures,
}: {
  signatures: DocumentSignatures;
}) {
  const [roots, setRoots] = useState(false);
  const { reports, error } = signatures;
  return (
    <Stack gap="4">
      {error ? (
        <ErrorNotice error={error} />
      ) : !reports ? (
        <LoadingLine label="Checking signatures" />
      ) : (
        <Stack as="ul" gap="3">
          {reports.map((r, i) => (
            <SignatureCard key={`${i}-${r.fieldName}`} r={r} />
          ))}
        </Stack>
      )}
      <Inline>
        <Button variant="outline" size="sm" onClick={() => setRoots(true)}>
          Trusted roots
        </Button>
      </Inline>
      <TrustedRootsDialog open={roots} onOpenChange={setRoots} />
    </Stack>
  );
}
