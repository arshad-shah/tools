import React, { useState } from 'react';
import { signatureInitials } from '@arshad-shah/cynosure/icons';
import {
  Button,
  Inline,
  SegmentedControl,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { deriveInitials } from '@/pdf/sign/initials';
import type { SignatureSourceProps } from '@/pdf/sign';
import { SignatureInk } from './SignatureInk';
import { SignatureTypeGallery } from './SignatureTypeGallery';

type Method = 'draw' | 'type';

export interface SignatureInitialsProps extends SignatureSourceProps {
  /** The name typed for the signature; the initials start from it. */
  name: string;
  /** Initials are made: "Initial pages" can put them on several pages. */
  ready: boolean;
  onInitialPages(): void;
}

/**
 * Initials (plan H-14 "Initials"): derived from the typed name and
 * editable, drawn or typed like the signature, and "Initial pages" to put
 * them at the same spot on several pages.
 */
export const SignatureInitials: React.FC<SignatureInitialsProps> = ({
  name,
  onChange,
  disabled,
  ready,
  onInitialPages,
}) => {
  const [initials, setInitials] = useState(() => deriveInitials(name));
  const [method, setMethod] = useState<Method>('type');

  return (
    <Stack gap="3">
      <SegmentedControl
        label="Method"
        size="sm"
        value={method}
        options={[
          { value: 'type', label: 'Type', disabled },
          { value: 'draw', label: 'Draw', disabled },
        ]}
        onChange={(m) => {
          setMethod(m as Method);
          onChange(null);
        }}
      />
      {method === 'type' ? (
        <>
          <TextField
            label="Initials"
            size="sm"
            value={initials}
            disabled={disabled}
            maxLength={8}
            onChange={setInitials}
          />
          <SignatureTypeGallery
            name={initials}
            onChange={onChange}
            disabled={disabled}
          />
        </>
      ) : (
        <SignatureInk
          label="Draw your initials"
          onChange={onChange}
          disabled={disabled}
        />
      )}
      <Stack gap="1">
        <Inline>
          <Button
            variant="outline"
            icon={signatureInitials}
            disabled={disabled || !ready}
            onClick={onInitialPages}
          >
            Initial pages
          </Button>
        </Inline>
        <Text size="sm" tone="muted">
          Puts these initials at the same spot on every page, or on the pages
          you choose.
        </Text>
      </Stack>
    </Stack>
  );
};
