import {
  Button,
  CopyButton,
  DescriptionList,
  Inline,
  Kbd,
  Menu,
  ProgressBar,
  Stack,
  TextField,
  Tooltip,
} from '@arshad-shah/cynosure';
import { refreshCw, send } from '@arshad-shah/cynosure/icons';
import React from 'react';
import { useNavigate } from 'react-router-dom';
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

/** The generated secret, masked until shown, with its strength. */
export const ResultCard: React.FC<ResultCardProps> = ({
  value,
  bits,
  label,
  onRegenerate,
}) => {
  const navigate = useNavigate();
  const times = crackTime(bits);
  const targets = passwordTargets(value);
  useSendCommands(
    'password-generator',
    targets.map((t) => ({
      target: t.toolId,
      run: () => sendTo(navigate, t.toolId, t.payload),
    })),
  );
  const name = `Generated ${label}`;
  return (
    <Stack gap="5">
      <TextField
        label={name}
        labelHidden
        type="password"
        revealable
        readOnly
        size="lg"
        value={value}
        labels={{ show: `Show the ${label}`, hide: `Hide the ${label}` }}
        addonEnd={
          <CopyButton
            size="sm"
            value={value}
            labels={{ copy: `Copy the ${label}` }}
          />
        }
      />
      <Inline gap="2" wrap>
        <Tooltip
          content={
            <Inline gap="2" align="center" as="span">
              Changing an option makes a new one too
              <Kbd keys="mod+enter" size="sm" />
            </Inline>
          }
        >
          <Button
            variant="solid"
            tone="accent"
            icon={refreshCw}
            aria-keyshortcuts="Control+Enter"
            onClick={onRegenerate}
          >
            Regenerate
          </Button>
        </Tooltip>
        {targets.length ? (
          <Menu
            label="Use in"
            items={targets.map((t) => ({ value: t.toolId, label: t.label }))}
            onSelect={(id) => {
              const t = targets.find((x) => x.toolId === id);
              if (t) sendTo(navigate, t.toolId, t.payload);
            }}
            trigger={(props) => (
              <Button {...props} variant="soft" icon={send}>
                Use in
              </Button>
            )}
          />
        ) : null}
      </Inline>
      <ProgressBar
        label="Strength"
        meter
        showValue
        value={Math.min(100, bits)}
        valueText={`${strengthLabel(bits)}, ${Math.round(bits)} bits`}
        tone={bits < 40 ? 'danger' : bits < 60 ? 'warning' : 'success'}
      />
      <DescriptionList
        size="sm"
        items={[
          {
            id: 'online',
            term: 'Online attack, 10,000 guesses a second',
            detail: times.online,
          },
          {
            id: 'offline',
            term: 'Offline fast hash, 10 billion guesses a second',
            detail: times.offline,
          },
        ]}
      />
    </Stack>
  );
};
