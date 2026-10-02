import type { EncryptOptions, Permissions } from '@/pdf/qpdf';
import { ToolError } from '@/shared/lib/errors';

export interface PermissionChoices {
  printing: 'none' | 'low' | 'full';
  modify: boolean;
  copy: boolean;
  annotate: boolean;
  fillForms: boolean;
  assemble: boolean;
}

export const DEFAULT_PERMISSIONS: PermissionChoices = {
  printing: 'full',
  modify: false,
  copy: false,
  annotate: true,
  fillForms: true,
  assemble: false,
};

/**
 * Readers treat "annotate" (bit 6) as also allowing form filling, so comments
 * imply forms; the UI shows the forms box as on and locked while comments
 * are allowed.
 */
export function toQpdfPermissions(c: PermissionChoices): Permissions {
  return {
    print: c.printing,
    modify: c.modify ? 'all' : 'none',
    extract: c.copy,
    annotate: c.annotate,
    form: c.fillForms || c.annotate,
    assemble: c.assemble,
  };
}

export interface PasswordInput {
  userPassword: string;
  confirmPassword: string;
  ownerPassword: string;
}

/** The first problem with the passwords, or null when they can be used. */
export function validatePasswords(p: PasswordInput): ToolError | null {
  const bad = (m: string) => new ToolError('INVALID_INPUT', m);
  if (!p.userPassword) return bad('Enter a password to open the file');
  if (p.userPassword !== p.confirmPassword)
    return bad('The passwords do not match');
  if (p.ownerPassword && p.ownerPassword === p.userPassword)
    return bad(
      'The permissions password must be different from the open password',
    );
  return null;
}

/** 48 hex characters (192 bits) from the platform CSPRNG. */
export function randomOwnerPassword(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** A blank permissions password becomes a random one: permissions stay locked for everyone. */
export function buildEncryptOptions(
  p: PasswordInput,
  c: PermissionChoices,
  random = randomOwnerPassword,
): EncryptOptions {
  const err = validatePasswords(p);
  if (err) throw err;
  return {
    userPassword: p.userPassword,
    ownerPassword: p.ownerPassword || random(),
    permissions: toQpdfPermissions(c),
  };
}

export interface PasswordStrength {
  level: 'weak' | 'fair' | 'strong';
  /** Plain words for the inline note. */
  message: string;
}

/**
 * A rough strength note for the open password (spec §13.3): under 8
 * characters is weak; 12 or more, or 8 or more mixing three kinds of
 * character (lower case, upper case, digits, symbols), is strong.
 */
export function passwordStrength(pw: string): PasswordStrength | null {
  if (!pw) return null;
  const length = [...pw].length;
  if (length < 8)
    return {
      level: 'weak',
      message: 'Weak password: use at least 8 characters',
    };
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) =>
    r.test(pw),
  ).length;
  if (length >= 12 || kinds >= 3)
    return { level: 'strong', message: 'Strong password' };
  return {
    level: 'fair',
    message:
      'Fair password: a longer one, or a mix of letters, numbers and symbols, is stronger',
  };
}

/** Whether a stored permissions choice is well formed (autosave restore). */
export function isPermissionChoices(v: unknown): v is PermissionChoices {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    ['none', 'low', 'full'].includes(o.printing as string) &&
    (['modify', 'copy', 'annotate', 'fillForms', 'assemble'] as const).every(
      (k) => typeof o[k] === 'boolean',
    )
  );
}
