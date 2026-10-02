import React from 'react';
import {
  IconClock,
  IconFileJson,
  IconShieldAlert,
  IconShieldCheck,
  IconShieldX,
} from '@/shared/ui/icons';

import { Card, CardBody, Inline, Input, Label, Stack, Text } from '@/shared/ui';
import type { SignatureStatus } from '../types';
import type { TimeStatus } from '../lib/jwt';
import { MAX_SKEW_SEC } from '../lib/constants';
import { SIGNATURE_TEXT, timeText } from '../lib/status';
import { StatusRow } from './StatusRow';

interface TokenStatusProps {
  timeStatus: TimeStatus;
  skewSec: number;
  setSkewSec: (sec: number) => void;
  sigStatus: SignatureStatus;
}

export const TokenStatus: React.FC<TokenStatusProps> = ({
  timeStatus,
  skewSec,
  setSkewSec,
  sigStatus,
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
          {...timeText(timeStatus)}
          icon={<IconClock size="md" />}
        />
        <Inline gap="2" align="center" wrap className="pl-8">
          <Label htmlFor="jwt-clock-skew">Clock skew (seconds)</Label>
          <div className="w-24">
            <Input
              id="jwt-clock-skew"
              type="number"
              min={0}
              max={MAX_SKEW_SEC}
              value={String(skewSec)}
              onChange={(v) => {
                const n = Math.floor(Number(v));
                setSkewSec(
                  Number.isFinite(n)
                    ? Math.min(MAX_SKEW_SEC, Math.max(0, n))
                    : 0,
                );
              }}
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
