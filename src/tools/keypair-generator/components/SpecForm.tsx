import { SegmentedControl, Select, Stack } from '@arshad-shah/cynosure';
import {
  ALGORITHMS,
  CURVES,
  familyOf,
  RSA_HASHES,
  RSA_SIZES,
  type Algorithm,
  type Curve,
  type KeySpec,
  type RsaHash,
  type RsaSize,
} from '../lib/spec';

export interface SpecFormProps {
  spec: KeySpec;
  onChange(patch: Partial<KeySpec>): void;
  /** Algorithms this browser cannot generate. */
  unsupported: ReadonlySet<Algorithm>;
  disabled?: boolean;
}

/** The key type: algorithm, then its size and hash or its curve. */
export function SpecForm({
  spec,
  onChange,
  unsupported,
  disabled,
}: SpecFormProps) {
  const family = familyOf(spec.algorithm);
  return (
    <Stack gap="5">
      <Select
        label="Algorithm"
        value={spec.algorithm}
        disabled={disabled}
        onChange={(v) => onChange({ algorithm: v as Algorithm })}
        options={ALGORITHMS.map((a) => ({
          value: a.value,
          label: a.label,
          description: unsupported.has(a.value)
            ? 'Not supported by this browser'
            : a.purpose,
          disabled: unsupported.has(a.value),
        }))}
      />
      {family === 'rsa' ? (
        <>
          <SegmentedControl
            label="Key size (bits)"
            fullWidth
            disabled={disabled}
            value={String(spec.size)}
            onChange={(v) => onChange({ size: Number(v) as RsaSize })}
            options={RSA_SIZES.map((s) => ({
              value: String(s),
              label: String(s),
            }))}
          />
          <SegmentedControl
            label="Hash"
            fullWidth
            disabled={disabled}
            value={spec.hash}
            onChange={(v) => onChange({ hash: v as RsaHash })}
            options={RSA_HASHES.map((h) => ({ value: h, label: h }))}
          />
        </>
      ) : null}
      {family === 'ec' ? (
        <SegmentedControl
          label="Curve"
          fullWidth
          disabled={disabled}
          value={spec.curve}
          onChange={(v) => onChange({ curve: v as Curve })}
          options={CURVES.map((c) => ({ value: c, label: c }))}
        />
      ) : null}
    </Stack>
  );
}
