import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Card,
  CodeBlock,
  Inline,
  Notice,
  Select,
  Stack,
  SegmentedControl,
  Text,
} from '@arshad-shah/cynosure';
import { clock } from '@arshad-shah/cynosure/icons';
import type { HandoffPayload } from '@/shared/lib/handoff';
import type { CategorizedClaims } from '../lib/categorize';
import { claimToEpoch } from '../lib/handoffs';
import type { TimeStatus } from '../lib/jwt';
import { SIGNATURE_TEXT, timeText } from '../lib/status';
import type { useSignatureVerification } from '../hooks/useSignatureVerification';
import { SKEW_OPTIONS } from '../settings';
import type { DecodedJWT, JwtTab } from '../types';
import { ClaimList } from './ClaimList';
import { SignaturePanel } from './SignaturePanel';

const GROUPS: { id: keyof CategorizedClaims; label: string }[] = [
  { id: 'identity', label: 'Identity claims' },
  { id: 'access', label: 'Access & permissions' },
  { id: 'timing', label: 'Timestamps' },
  { id: 'issuer', label: 'Issuer information' },
  { id: 'custom', label: 'Custom claims' },
];

const json = (v: unknown) => JSON.stringify(v, null, 2);

export interface DecodedCardProps {
  decoded: DecodedJWT;
  jwt: string;
  claims: CategorizedClaims;
  timeStatus: TimeStatus;
  nowSec: number;
  expired: boolean;
  skewSec: number;
  onSkew(sec: number): void;
  tab: JwtTab;
  onTab(tab: JwtTab): void;
  verify: ReturnType<typeof useSignatureVerification>;
  onEpoch(payload: HandoffPayload): void;
}

/**
 * The decoded token: what it says about time and its signature first (in
 * words, with their tones), then the header, the claims and the signature.
 */
export function DecodedCard({
  decoded,
  jwt,
  claims,
  timeStatus,
  nowSec,
  expired,
  skewSec,
  onSkew,
  tab,
  onTab,
  verify,
  onEpoch,
}: DecodedCardProps) {
  const time = timeText(timeStatus, nowSec);
  const sig = SIGNATURE_TEXT[verify.sigStatus.state];
  const sigDetail =
    verify.sigStatus.state === 'error' ? verify.sigStatus.message : sig.detail;
  const epochs = (['exp', 'iat'] as const).flatMap((c) => {
    const p = claimToEpoch(decoded, c);
    return p ? [{ claim: c, payload: p }] : [];
  });
  const openGroups = GROUPS.filter(
    (g) => g.id !== 'custom' && claims[g.id].length,
  ).map((g) => g.id);

  return (
    <Card as="section" title="Decoded token">
      <Stack gap="6">
        <Stack gap="4" role="group" aria-label="Token status">
          <Notice tone={time.tone} title={time.title}>
            <Stack gap="4">
              <Text as="p">{time.detail}</Text>
              <Select
                label="Clock skew"
                description="Leeway for exp, nbf and iat when clocks differ."
                size="sm"
                value={String(skewSec)}
                onChange={(v) => onSkew(Number(v))}
                options={SKEW_OPTIONS.map((n) => ({
                  value: String(n),
                  label: n === 0 ? 'None' : `${n} s`,
                }))}
              />
            </Stack>
          </Notice>
          <Notice tone={sig.tone} title={sig.title}>
            {sigDetail}
          </Notice>
        </Stack>
        {epochs.length ? (
          <Inline gap="2" wrap>
            {epochs.map(({ claim, payload }) => (
              <Button
                key={claim}
                size="sm"
                variant="soft"
                icon={clock}
                onClick={() => onEpoch(payload)}
              >
                {`Open ${claim} in Epoch Converter`}
              </Button>
            ))}
          </Inline>
        ) : null}
        <SegmentedControl
          label="JWT sections"
          fullWidth
          value={tab}
          onChange={(v) => onTab(v as JwtTab)}
          options={[
            { value: 'header', label: 'Header' },
            {
              value: 'payload',
              label: `Payload (${Object.keys(decoded.payload).length})`,
            },
            { value: 'signature', label: 'Signature' },
          ]}
        />
        {tab === 'header' ? (
          <>
            <Stack gap="5">
              <Inline gap="2" wrap>
                <Badge tone="accent">{decoded.header.alg}</Badge>
                {decoded.header.typ ? (
                  <Badge tone="neutral">{decoded.header.typ}</Badge>
                ) : null}
              </Inline>
              <ClaimList
                claims={Object.entries(decoded.header)}
                nowSec={nowSec}
              />
              <CodeBlock
                title="Header JSON"
                code={json(decoded.header)}
                language="json"
                copyable
              />
            </Stack>
          </>
        ) : null}
        {tab === 'payload' ? (
          <>
            <Accordion type="multiple" defaultValue={openGroups}>
              {GROUPS.filter((g) => claims[g.id].length).map((g) => (
                <AccordionItem
                  key={g.id}
                  value={g.id}
                  summary={`${g.label} (${claims[g.id].length})`}
                >
                  <ClaimList
                    claims={claims[g.id]}
                    nowSec={nowSec}
                    expired={expired}
                  />
                </AccordionItem>
              ))}
              <AccordionItem value="raw" summary="Raw JSON">
                <CodeBlock
                  title="Payload JSON"
                  code={json(decoded.payload)}
                  language="json"
                  copyable
                />
              </AccordionItem>
            </Accordion>
          </>
        ) : null}
        {tab === 'signature' ? (
          <>
            <SignaturePanel
              signature={decoded.signature}
              algorithm={decoded.header.alg}
              jwt={jwt}
              verify={verify}
            />
          </>
        ) : null}
      </Stack>
    </Card>
  );
}
