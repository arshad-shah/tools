import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Card,
  CodeBlock,
  Inline,
  Menu,
  Notice,
  Popover,
  Select,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from '@arshad-shah/cynosure';
import { chevronDown, clock } from '@arshad-shah/cynosure/icons';
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

const CLAIM_NAME = { exp: 'Expiry (exp)', iat: 'Issued at (iat)' } as const;

/** Clock skew, behind a header button: rarely changed, saved as a setting. */
function SkewPopover({
  skewSec,
  onSkew,
}: {
  skewSec: number;
  onSkew(sec: number): void;
}) {
  return (
    <Popover
      label="Clock skew"
      trigger={(props) => (
        <Button {...props} size="sm" variant="ghost" icon={clock}>
          {skewSec ? `Skew ${skewSec} s` : 'Clock skew'}
        </Button>
      )}
    >
      <Select
        label="Clock skew"
        description="Leeway for exp, nbf and iat when clocks differ."
        value={String(skewSec)}
        onChange={(v) => onSkew(Number(v))}
        options={SKEW_OPTIONS.map((n) => ({
          value: String(n),
          label: n === 0 ? 'None' : `${n} s`,
        }))}
      />
    </Popover>
  );
}

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
    <Card
      as="section"
      title="Decoded token"
      actions={<SkewPopover skewSec={skewSec} onSkew={onSkew} />}
    >
      <Stack gap="6">
        <Stack gap="4" role="group" aria-label="Token status">
          <Notice tone={time.tone} title={time.title}>
            <Text as="p">{time.detail}</Text>
          </Notice>
          <Notice tone={sig.tone} title={sig.title}>
            {sigDetail}
          </Notice>
        </Stack>
        {epochs.length === 1 ? (
          <Inline>
            <Button
              size="sm"
              variant="soft"
              icon={clock}
              onClick={() => onEpoch(epochs[0]!.payload)}
            >
              {`Open ${epochs[0]!.claim} in Epoch Converter`}
            </Button>
          </Inline>
        ) : epochs.length > 1 ? (
          <Inline>
            <Menu
              label="Open in Epoch Converter"
              items={epochs.map(({ claim }) => ({
                value: claim,
                label: CLAIM_NAME[claim],
              }))}
              onSelect={(v) => {
                const e = epochs.find((x) => x.claim === v);
                if (e) onEpoch(e.payload);
              }}
              trigger={(props) => (
                <Button
                  {...props}
                  size="sm"
                  variant="soft"
                  icon={clock}
                  iconEnd={chevronDown}
                >
                  Open in Epoch Converter
                </Button>
              )}
            />
          </Inline>
        ) : null}
        <Tabs value={tab} onChange={(v) => onTab(v as JwtTab)}>
          <TabList label="JWT sections">
            <Tab value="header">Header</Tab>
            <Tab value="payload">
              {`Payload (${Object.keys(decoded.payload).length})`}
            </Tab>
            <Tab value="signature">Signature</Tab>
          </TabList>
          <TabPanel value="header">
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
          </TabPanel>
          <TabPanel value="payload">
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
          </TabPanel>
          <TabPanel value="signature">
            <SignaturePanel
              signature={decoded.signature}
              algorithm={decoded.header.alg}
              jwt={jwt}
              verify={verify}
            />
          </TabPanel>
        </Tabs>
      </Stack>
    </Card>
  );
}
