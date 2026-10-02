import React from 'react';
import { TextInputPanel } from '@/shared/ui';
import { SAMPLE_JWT } from '../lib/constants';
import { isTokenHandoff } from '../lib/handoffs';

interface TokenInputProps {
  jwt: string;
  setJwt: (jwt: string) => void;
  /** Label of the panel (a second one compares tokens). */
  label?: string;
  /** Accept an application/jwt hand-off into this panel. */
  acceptHandoff?: boolean;
}

/** The token source: paste, open, drop, sample or a hand-off. */
export const TokenInput: React.FC<TokenInputProps> = ({
  jwt,
  setJwt,
  label = 'JWT token',
  acceptHandoff = true,
}) => (
  <TextInputPanel
    label={label}
    value={jwt}
    onChange={setJwt}
    language="plain"
    wrap
    samples={[{ label: 'Sample token', value: SAMPLE_JWT }]}
    handoff={acceptHandoff ? isTokenHandoff : undefined}
    placeholder="Paste a JWT (a Bearer prefix, quotes and spaces are removed)"
    minHeight={96}
    maxHeight={240}
  />
);
