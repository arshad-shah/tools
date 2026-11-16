import { useState } from 'react';
import { Grid, Stack, Text, TextField } from '@arshad-shah/cynosure';
import type { ExportOptions } from '@/pdf/doc/export-stages';
import { passwordStrength, validatePasswords } from '@/pdf/edit/permissions';
import type { DocumentApi } from '../types';

const text = (v: unknown) => (typeof v === 'string' ? v : '');

const KEYS = ['password', 'confirmPassword', 'ownerPassword'] as const;

interface Props {
  doc: DocumentApi;
  options: ExportOptions;
  set(patch: Partial<ExportOptions>): void;
}

/**
 * "Password protection" in the Export dialog (plan E-10): the passwords are
 * typed here, used by the encrypt stage and never stored (G25).
 */
export function ProtectExportSection({ options, set }: Props) {
  const password = text(options.password);
  const confirm = text(options.confirmPassword);
  const owner = text(options.ownerPassword);
  const check = validatePasswords({
    userPassword: password,
    confirmPassword: confirm,
    ownerPassword: owner,
  });
  // Errors wait until the user has typed: an empty form is not a mistake yet.
  const [touched, setTouched] = useState(false);
  const problem = touched ? check : null;
  const strength = passwordStrength(password);
  const invalid = (key: 'password' | 'confirmPassword' | 'ownerPassword') =>
    !!problem &&
    (key === 'confirmPassword'
      ? !!password && confirm !== password
      : key === 'ownerPassword'
        ? !!owner && owner === password
        : !password);
  const field = (
    key: 'password' | 'confirmPassword' | 'ownerPassword',
    label: string,
    value: string,
  ) => (
    <TextField
      label={label}
      type="password"
      revealable
      autoComplete="new-password"
      value={value}
      error={invalid(key) ? problem?.message : undefined}
      onChange={(v) => {
        setTouched(true);
        set({ [key]: v });
      }}
    />
  );
  return (
    <Stack gap="3">
      <Grid columns={{ base: 1, sm: 2 }} gap="3">
        {field('password', 'Password to open', password)}
        {field('confirmPassword', 'Confirm password', confirm)}
      </Grid>
      {strength ? (
        <Text
          size="sm"
          tone={strength.level === 'weak' ? 'danger' : 'muted'}
          aria-live="polite"
        >
          {strength.message}
        </Text>
      ) : null}
      {problem && !KEYS.some(invalid) ? (
        <Text size="sm" tone="danger" aria-live="polite">
          {problem.message}
        </Text>
      ) : null}
      {field('ownerPassword', 'Owner password (optional)', owner)}
      <Text size="sm" tone="muted">
        The owner password lifts the permissions. Leave it blank to lock them
        with a random password nobody knows. Passwords are not saved anywhere.
      </Text>
    </Stack>
  );
}
