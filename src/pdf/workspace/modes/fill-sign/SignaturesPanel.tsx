import { useState } from 'react';
import {
  IconSignatureBroken,
  IconSignatureUnknown,
  IconSignatureVerified,
} from '@/shared/ui/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  ErrorState,
  LoadingState,
  MetaList,
  Stack,
  Text,
} from '@/shared/ui';
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
      Icon: IconSignatureBroken,
      tone: 'text-danger',
      label: 'Invalid signature',
    };
  if (r.trust === 'trusted')
    return {
      Icon: IconSignatureVerified,
      tone: 'text-accent-fg',
      label: 'Trusted signature',
    };
  return {
    Icon: IconSignatureUnknown,
    tone: 'text-warning',
    label: 'Signer not verified',
  };
}

function SignatureCard({ r }: { r: SignatureReport }) {
  const { Icon, tone, label } = iconFor(r);
  return (
    <li className="flex flex-col gap-2 rounded-md border border-line p-3">
      <div className="flex items-start gap-2">
        <span className={tone}>
          <Icon size="md" label={label} />
        </span>
        <Stack gap="1" className="min-w-0">
          <Text size="sm" className="font-medium text-fg">
            {r.signer?.subjectCN || r.fieldName}
          </Text>
          <Text size="sm">{r.summary}</Text>
        </Stack>
      </div>
      <MetaList
        items={[
          when(r.time.value),
          timeSourceText(r),
          r.coverage === 'whole-document'
            ? 'Covers the whole document'
            : 'Document changed after signing',
        ]}
      />
      <ul className="flex flex-col gap-1 text-sm text-fg-muted">
        {r.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
        {r.problems.map((p) => (
          <li key={p} className="text-danger">
            {p}
          </li>
        ))}
      </ul>
      {r.signer ? (
        <Accordion type="single">
          <AccordionItem value="cert" className="shadow-none">
            <AccordionTrigger>Show certificate</AccordionTrigger>
            <AccordionContent>
              <Stack gap="3">
                {r.chain.map((c, i) => (
                  <Stack key={c.sha256} gap="1">
                    {r.chain.length > 1 ? (
                      <Text size="sm" tone="muted">
                        {i === 0 ? 'Signer' : `Issuer ${i}`}
                      </Text>
                    ) : null}
                    <CertificateDetails info={c} />
                  </Stack>
                ))}
              </Stack>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </li>
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
    <Stack gap="3" className="p-3">
      {error ? (
        <ErrorState error={error} headingLevel={3} />
      ) : !reports ? (
        <LoadingState label="Checking signatures" />
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => (
            <SignatureCard key={r.fieldName} r={r} />
          ))}
        </ul>
      )}
      <div>
        <Button variant="secondary" size="sm" onClick={() => setRoots(true)}>
          Trusted roots
        </Button>
      </div>
      <TrustedRootsDialog open={roots} onOpenChange={setRoots} />
    </Stack>
  );
}
