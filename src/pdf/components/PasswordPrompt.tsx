import React, { useId, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
  Text,
} from '@/shared/ui';

interface PasswordPromptProps {
  fileName: string;
  error?: string | null;
  busy?: boolean;
  /** The host is busy (e.g. merging): nothing can be submitted. */
  disabled?: boolean;
  onSubmit: (password: string) => void;
  /** Shows "Skip this file" when set. */
  onCancel?: () => void;
  submitLabel?: string;
  description?: string;
}

/** Asks for one file's password. Never submits an empty one. */
export const PasswordPrompt: React.FC<PasswordPromptProps> = ({
  fileName,
  error,
  busy,
  disabled,
  onSubmit,
  onCancel,
  submitLabel = 'Unlock',
  description = 'Enter its password to open it. It is decrypted in your browser and never uploaded.',
}) => {
  const id = useId();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  return (
    <form
      aria-label={`Unlock ${fileName}`}
      className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (password && !busy && !disabled) onSubmit(password);
      }}
    >
      <Text size="sm" weight="semibold">
        {fileName} is password-protected
      </Text>
      <Text size="sm" tone="muted">
        {description}
      </Text>
      <Label htmlFor={id}>Password for {fileName}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete="off"
          value={password}
          onChange={setPassword}
          invalid={!!error}
          disabled={busy || disabled}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        >
          {show ? 'Hide' : 'Show'}
        </Button>
      </div>
      {error && (
        <Alert status="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="primary"
          loading={busy}
          disabled={!password || busy || disabled}
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Skip this file
          </Button>
        )}
      </div>
    </form>
  );
};
