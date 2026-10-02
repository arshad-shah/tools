import { toolsAccepting } from '@/app/registry';
import type { ToolManifest } from '@/app/tool';
import type { HandoffPayload } from '@/shared/lib/handoff';

export const SECRET_MIME = 'application/vnd.tools.secret';

const TARGETS = [
  { toolId: 'pdf-protect', label: 'Use for PDF Protect', mime: SECRET_MIME },
  {
    toolId: 'text-encrypt',
    label: 'Use as passphrase in Text Encrypt',
    mime: SECRET_MIME,
  },
  { toolId: 'hash-generator', label: 'Hash this', mime: 'text/plain' },
] as const;

export interface PasswordTarget {
  toolId: string;
  label: string;
  payload: HandoffPayload;
}

/**
 * Where a password can be sent (spec §10), limited to tools whose manifest
 * accepts the mime, so the menu omits a target that would ignore it.
 */
export function passwordTargets(
  password: string,
  tools?: readonly ToolManifest[],
): PasswordTarget[] {
  return TARGETS.filter((t) =>
    toolsAccepting(t.mime, tools).some((m) => m.id === t.toolId),
  ).map((t) => ({
    toolId: t.toolId,
    label: t.label,
    payload: {
      kind: 'text',
      mime: t.mime,
      text: password,
      sourceTool: 'password-generator',
    },
  }));
}
