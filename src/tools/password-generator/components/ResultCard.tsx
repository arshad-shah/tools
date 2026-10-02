import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconRefreshCw } from '@/shared/ui/icons';
import {
  Button,
  Inline,
  Kbd,
  Meter,
  SecretText,
  Stack,
  Text,
} from '@/shared/ui';
import { sendTo } from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';
import { crackTime, strengthLabel } from '../lib/entropy';
import { passwordTargets } from '../lib/handoffs';

interface ResultCardProps {
  value: string;
  bits: number;
  /** Names the value in labels: "password", "passphrase" or "PIN". */
  label: string;
  onRegenerate(): void;
}

/** The generated secret, masked until revealed, with its strength. */
export const ResultCard: React.FC<ResultCardProps> = ({
  value,
  bits,
  label,
  onRegenerate,
}) => {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const times = crackTime(bits);
  const targets = passwordTargets(value);
  useSendCommands(
    'password-generator',
    targets.map((t) => ({
      target: t.toolId,
      run: () => sendTo(navigate, t.toolId, t.payload),
    })),
  );
  return (
    <Stack gap="3">
      <Inline gap="2" align="center" wrap={false}>
        <div className="min-w-0 flex-1" data-dynamic="">
          <SecretText
            value={value}
            revealed={revealed}
            onRevealedChange={setRevealed}
            copyable
            label={label}
          />
        </div>
        <Button
          variant="primary"
          leftIcon={<IconRefreshCw size="sm" />}
          onClick={onRegenerate}
        >
          Regenerate
        </Button>
      </Inline>
      <Text size="xs" tone="subtle">
        Changing an option makes a new one; <Kbd keys="Mod+Enter" /> does too.
      </Text>
      <Meter
        label="Strength"
        value={Math.min(1, bits / 100)}
        valueText={`${strengthLabel(bits)}, ${Math.round(bits)} bits`}
      />
      <Stack gap="1">
        <Text size="sm">
          Online attack at 10,000 guesses a second: {times.online}
        </Text>
        <Text size="sm">
          Offline fast hash at 10 billion guesses a second: {times.offline}
        </Text>
      </Stack>
      <Inline gap="2" wrap>
        {targets.map((t) => (
          <Button
            key={t.toolId}
            variant="secondary"
            size="sm"
            onClick={() => sendTo(navigate, t.toolId, t.payload)}
          >
            {t.label}
          </Button>
        ))}
      </Inline>
    </Stack>
  );
};
