import { Alert, AlertDescription, MetaList, Stack, Text } from '@/shared/ui';
import type { CertInfo } from '@/pdf/sign/pades/cert-info';

const day = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);

export const SELF_SIGNED_WARNING =
  'Self-signed certificates prove the file was not changed, not who signed it';

/** A certificate in plain words, with honest warnings (self-signed, expired). */
export function CertificateSummary({
  info,
  now,
}: {
  info: CertInfo;
  /** The time to judge expiry at (the moment the certificate was chosen). */
  now: Date;
}) {
  const expired = info.notAfter.getTime() < now.getTime();
  return (
    <Stack gap="2">
      <Text size="sm" className="font-medium text-fg">
        {info.subjectCN || info.subject}
      </Text>
      <MetaList
        items={[
          info.selfSigned
            ? 'Self-signed'
            : `Issued by ${info.issuerCN || info.issuer}`,
          `Valid ${day(info.notBefore)} to ${day(info.notAfter)}`,
          info.keyDescription,
        ]}
      />
      {expired ? (
        <Alert status="warning">
          <AlertDescription>
            This certificate expired on {day(info.notAfter)}.
          </AlertDescription>
        </Alert>
      ) : null}
      {info.selfSigned ? (
        <Alert status="warning">
          <AlertDescription>{SELF_SIGNED_WARNING}</AlertDescription>
        </Alert>
      ) : null}
    </Stack>
  );
}

/** The certificate details behind a "Show certificate" disclosure. */
export function CertificateDetails({ info }: { info: CertInfo }) {
  const rows: [string, string][] = [
    ['Subject', info.subject],
    ['Issuer', info.issuer],
    ['Serial number', info.serialHex],
    ['Valid from', day(info.notBefore)],
    ['Valid until', day(info.notAfter)],
    ['Key', info.keyDescription],
    ['SHA-256', info.sha256],
  ];
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-fg-muted">{k}</dt>
          <dd className="break-all font-mono-meta text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
