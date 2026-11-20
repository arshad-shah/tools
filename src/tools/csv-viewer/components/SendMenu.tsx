import { Button, Menu, type MenuSection } from '@arshad-shah/cynosure';
import { send } from '@arshad-shah/cynosure/icons';
import { useNavigate } from 'react-router-dom';
import { toolsAccepting } from '@/app/registry';
import { MOCK_SCHEMA_MIME } from '@/shared/lib/data-formats';
import { sendTo, type HandoffPayload } from '@/shared/lib/handoff';

export type SendKind = 'json' | 'csv' | 'table' | 'schema';

const KINDS: readonly [SendKind, string, string][] = [
  ['json', 'Rows as JSON', 'application/json'],
  ['csv', 'Rows as CSV', 'text/plain'],
  ['table', 'Rows as a table', 'text/csv'],
  ['schema', 'More like this', MOCK_SCHEMA_MIME],
];

interface SendMenuProps {
  toolId: string;
  /** Builds the payload of each kind when a target is chosen. */
  payloads: Record<SendKind, () => HandoffPayload>;
}

/**
 * Send to: the shown rows as JSON or CSV (plain text for Text Diff and the
 * like, text/csv for tools that load tables), or a schema for more like it.
 * Hidden when no tool takes any of them.
 */
export function SendMenu({ toolId, payloads }: SendMenuProps) {
  const navigate = useNavigate();
  const sections: MenuSection[] = KINDS.map(([kind, label, mime]) => ({
    label,
    items: toolsAccepting(mime)
      .filter((t) => t.id !== toolId)
      .map((t) => ({ value: `${kind}:${t.id}`, label: t.name })),
  })).filter((x) => x.items.length);
  if (!sections.length) return null;
  return (
    <Menu
      label="Send to"
      items={sections}
      onSelect={(v) => {
        const [kind, id] = v.split(':') as [SendKind, string];
        if (kind && id) sendTo(navigate, id, payloads[kind]());
      }}
      trigger={(props) => (
        <Button {...props} size="sm" variant="soft" icon={send}>
          Send to
        </Button>
      )}
    />
  );
}
