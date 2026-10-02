import React from 'react';
import {
  IconClock,
  IconFileJson,
  IconShieldAlert,
  IconShieldCheck,
  IconShieldX,
} from '@/shared/ui/icons';

import {
  Card,
  CardBody,
  Inline,
  Label,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import type { SignatureStatus } from '../types';
import type { TimeStatus } from '../lib/jwt';
import { SKEW_OPTIONS } from '../settings';
import { SIGNATURE_TEXT, timeText } from '../lib/status';
import { StatusRow } from './StatusRow';

interface TokenStatusProps {
  timeStatus: TimeStatus;
  skewSec: number;
  setSkewSec: (sec: number) => void;
  sigStatus: SignatureStatus;
  /** Now, in seconds, for the live countdown (ticks each second). */
  nowSec: number;
}

export const TokenStatus: React.FC<TokenStatusProps> = ({
  timeStatus,
  skewSec,
  setSkewSec,
  sigStatus,
  nowSec,
}) => (
  <Card>
    <CardBody>
      <Stack gap="4" role="group" aria-label="Token status">
        <StatusRow
          label="Decoded"
          title="Header and payload decoded"
          detail=""
          tone="neutral"
          icon={<IconFileJson size="md" />}
        />
        <StatusRow
          label="Time claims"
          {...timeText(timeStatus, nowSec)}
          live
          icon={<IconClock size="md" />}
        />
        <Inline gap="2" align="center" wrap className="pl-8">
          <Label htmlFor="jwt-clock-skew">Clock skew</Label>
          <div className="w-32">
            <Select
              id="jwt-clock-skew"
              value={String(skewSec)}
              onValueChange={(v) => setSkewSec(Number(v))}
              items={SKEW_OPTIONS.map((n) => ({
                value: String(n),
                label: n === 0 ? 'None' : `${n} s`,
              }))}
            />
          </div>
          <Text size="xs" tone="subtle">
            Leeway for exp, nbf and iat when clocks differ.
          </Text>
        </Inline>
        <StatusRow
          label="Signature"
          title={SIGNATURE_TEXT[sigStatus.state].title}
          detail={
            sigStatus.state === 'error'
              ? sigStatus.message
              : SIGNATURE_TEXT[sigStatus.state].detail
          }
          tone={SIGNATURE_TEXT[sigStatus.state].tone}
          icon={
            sigStatus.state === 'verified' ? (
              <IconShieldCheck size="md" />
            ) : sigStatus.state === 'invalid' || sigStatus.state === 'error' ? (
              <IconShieldX size="md" />
            ) : (
              <IconShieldAlert size="md" />
            )
          }
        />
      </Stack>
    </CardBody>
  </Card>
);
