import React from 'react';
import { IconClock, IconColumns } from '@/shared/ui/icons';
import {
  Button,
  Inline,
  SendToMenu,
  Stack,
  ToolActions,
  Tooltip,
} from '@/shared/ui';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { claimToEpoch, payloadToJson } from '../lib/handoffs';
import type { DecodedJWT } from '../types';
import { TokenInput } from './TokenInput';

interface DecodeActionsProps {
  decoded: DecodedJWT;
  compareOpen: boolean;
  onCompareOpen(open: boolean): void;
  other: string;
  onOther(token: string): void;
  /** The second token decodes, so the pair can go to Text Diff. */
  canCompare: boolean;
  onCompare(): void;
  /** Opens a time claim in the Epoch Converter. */
  onEpoch(payload: HandoffPayload): void;
}

/**
 * What to do with a decoded token: send the payload, compare it with a
 * second token in Text Diff (a diff pair), open exp or iat in the Epoch
 * Converter. Text Diff takes the pair mime and Epoch takes text/plain.
 */
export const DecodeActions: React.FC<DecodeActionsProps> = ({
  decoded,
  compareOpen,
  onCompareOpen,
  other,
  onOther,
  canCompare,
  onCompare,
  onEpoch,
}) => (
  <Stack gap="3">
    <ToolActions>
      <SendToMenu
        payload={() => payloadToJson(decoded)}
        sourceTool="jwt-decode"
        label="Send payload to"
        size="sm"
      />
    </ToolActions>
    <Inline gap="1" wrap>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<IconColumns size="sm" />}
        onClick={() => onCompareOpen(!compareOpen)}
        aria-expanded={compareOpen}
      >
        Compare with another token
      </Button>
      {(['exp', 'iat'] as const).map((c) => {
        const p = claimToEpoch(decoded, c);
        return p ? (
          <Tooltip key={c} content={`Open ${c} in Epoch Converter`}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<IconClock size="sm" />}
              aria-label={`Open ${c} in Epoch Converter`}
              onClick={() => onEpoch(p)}
            >
              {c === 'exp' ? 'Expiry time' : 'Issued time'}
            </Button>
          </Tooltip>
        ) : null;
      })}
    </Inline>
    {compareOpen && (
      <Stack gap="2">
        <TokenInput
          jwt={other}
          setJwt={onOther}
          label="Token to compare"
          acceptHandoff={false}
        />
        <Inline gap="2" align="center" wrap>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canCompare}
            onClick={onCompare}
          >
            Compare payloads in Text Diff
          </Button>
        </Inline>
      </Stack>
    )}
  </Stack>
);
