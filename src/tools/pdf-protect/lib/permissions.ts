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
