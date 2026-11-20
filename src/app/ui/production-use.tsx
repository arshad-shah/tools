import { CodeBlock, Disclosure, Notice, Stack } from '@arshad-shah/cynosure';
import { shieldCheck } from '@arshad-shah/cynosure/icons';
import type React from 'react';

/** A command that does the same job outside the browser. */
export interface LocalCommand {
  /** What the command makes or does, e.g. "Private key (PEM)". */
  label: string;
  command: string;
}

export interface ProductionUseNoticeProps {
  /** Default "For development and testing". */
  title?: string;
  /** What is safe here and what to use for production instead. */
  children: React.ReactNode;
  /** The same job on the user's own machine, shown in a closed disclosure. */
  commands?: readonly LocalCommand[];
  /** Disclosure summary. Default "Do this on your own machine instead". */
  commandsLabel?: string;
}

/**
 * One wording for tools that make or handle secrets people may use in
 * production (keys, signing keys, passwords, encryption): the browser is
 * fine for development and testing; production secrets belong in local
 * tools, a KMS or a password manager. The page's code is fetched on every
 * visit, so a page can never be as trustworthy as a tool already on disk.
 */
export function ProductionUseNotice({
  title = 'For development and testing',
  children,
  commands,
  commandsLabel = 'Do this on your own machine instead',
}: ProductionUseNoticeProps) {
  return (
    <Stack gap="3">
      <Notice tone="warning" icon={shieldCheck} title={title}>
        {children}
      </Notice>
      {commands && commands.length > 0 ? (
        <Disclosure summary={commandsLabel} variant="line" size="sm">
          <Stack gap="3">
            {commands.map((c) => (
              <CodeBlock
                key={c.label}
                title={c.label}
                code={c.command}
                wrap
                copyable
              />
            ))}
          </Stack>
        </Disclosure>
      ) : null}
    </Stack>
  );
}
