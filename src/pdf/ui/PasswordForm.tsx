import {
  Button,
  Form,
  Inline,
  Notice,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { lock } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';

export interface PasswordFormProps {
  fileName: string;
  error?: string | null;
  busy?: boolean;
  /** The host is busy (e.g. merging): nothing can be submitted. */
  disabled?: boolean;
  onSubmit(password: string): void;
  /** Shows "Skip this file" when set. */
  onCancel?(): void;
  submitLabel?: string;
  description?: string;
}

/**
 * Asks for one encrypted PDF's password, next to the file it is for
 * (redesign spec: errors sit next to what caused them). A Cynosure Form:
 * Enter submits;
 * an empty password is never submitted.
 */
export function PasswordForm({
  fileName,
  error,
  busy,
  disabled,
  onSubmit,
  onCancel,
  submitLabel = 'Unlock',
  description = 'Enter its password to open it. It is decrypted in your browser and never uploaded.',
}: PasswordFormProps) {
  const [password, setPassword] = useState('');
  const submit = () => {
    if (password && !busy && !disabled) onSubmit(password);
  };
  return (
    <Notice
      tone="warning"
      icon={lock}
      title={`${fileName} is password-protected`}
    >
      <Form label={`Unlock ${fileName}`} gap="4" onSubmit={submit}>
        <Text as="p">{description}</Text>
        <TextField
          label={`Password for ${fileName}`}
          type="password"
          revealable
          autoComplete="off"
          value={password}
          onChange={setPassword}
          error={error ?? undefined}
          disabled={busy || disabled}
        />
        <Inline gap="2" wrap>
          <Button
            variant="solid"
            tone="accent"
            loading={busy}
            disabled={!password || busy || disabled}
            type="submit"
          >
            {submitLabel}
          </Button>
          {onCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              Skip this file
            </Button>
          ) : null}
        </Inline>
      </Form>
    </Notice>
  );
}
