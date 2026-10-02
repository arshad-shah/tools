import { useId, useState } from 'react';
import { Input, Label, Text } from '@/shared/ui';
import type { ExportOptions } from '@/pdf/doc/export-stages';
import { passwordStrength, validatePasswords } from '@/pdf/edit/permissions';
import type { DocumentApi } from '../types';

const text = (v: unknown) => (typeof v === 'string' ? v : '');

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
  const id = useId();
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type="password"
        autoComplete="new-password"
        value={value}
        invalid={invalid(key)}
        aria-invalid={invalid(key) || undefined}
        onChange={(v) => {
          setTouched(true);
          set({ [key]: v });
        }}
      />
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {field('password', 'Password to open', password)}
        {field('confirmPassword', 'Confirm password', confirm)}
      </div>
      {strength ? (
        <Text
          size="sm"
          tone="muted"
          className={strength.level === 'weak' ? 'text-danger' : undefined}
          aria-live="polite"
        >
          {strength.message}
        </Text>
      ) : null}
      {problem ? (
        <Text size="sm" className="text-danger" aria-live="polite">
          {problem.message}
        </Text>
      ) : null}
      {field('ownerPassword', 'Owner password (optional)', owner)}
      <Text size="sm" tone="muted">
        The owner password lifts the permissions. Leave it blank to lock them
        with a random password nobody knows. Passwords are not saved anywhere.
      </Text>
    </div>
  );
}
