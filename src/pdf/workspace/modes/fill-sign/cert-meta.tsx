import { DescriptionList, Notice, Stack, Text } from '@arshad-shah/cynosure';
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
      <Text size="sm" weight="medium">
        {info.subjectCN || info.subject}
      </Text>
      <Text size="sm" tone="muted">
        {[
          info.selfSigned
            ? 'Self-signed'
            : `Issued by ${info.issuerCN || info.issuer}`,
          `valid ${day(info.notBefore)} to ${day(info.notAfter)}`,
          info.keyDescription,
        ].join(', ')}
      </Text>
      {expired ? (
        <Notice tone="warning" size="sm">
          {`This certificate expired on ${day(info.notAfter)}.`}
        </Notice>
      ) : null}
      {info.selfSigned ? (
        <Notice tone="warning" size="sm">
          {SELF_SIGNED_WARNING}
        </Notice>
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
    <DescriptionList
      size="sm"
      layout="inline"
      items={rows.map(([term, detail]) => ({ id: term, term, detail }))}
    />
  );
}
