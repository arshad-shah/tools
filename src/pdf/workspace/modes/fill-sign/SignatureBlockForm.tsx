import React, { useState } from 'react';
import { fieldSignature } from '@arshad-shah/cynosure/icons';
import {
  Button,
  Inline,
  Notice,
  Stack,
  Switch,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { formatBlockDate, type BlockContent } from '@/pdf/sign/block';
import { todayIso, userLocale } from './dates';
import type { ReadySignature } from './store';

export interface SignatureBlockFormProps {
  /** The signature made in the panel (null: make one first). */
  signature: ReadySignature | null;
  /** The typed name, to start the printed name from. */
  name: string;
  disabled?: boolean;
  onPlace(content: BlockContent, aspect: number): void;
}

/**
 * A signature block (plan H-14 "Block"): the current signature over the
 * printed name, an optional title and today's date in the user's locale.
 */
export const SignatureBlockForm: React.FC<SignatureBlockFormProps> = ({
  signature,
  name,
  disabled,
  onPlace,
}) => {
  const [printed, setPrinted] = useState(name);
  const [title, setTitle] = useState('');
  const [showDate, setShowDate] = useState(true);
  const [dateIso] = useState(() => todayIso());
  const [locale] = useState(userLocale);

  return (
    <Stack gap="3">
      {signature ? null : (
        <Notice tone="info" size="sm">
          Make your signature in the Draw, Type, Photo or Upload tab first. The
          block uses it.
        </Notice>
      )}
      <TextField
        label="Printed name"
        size="sm"
        value={printed}
        disabled={disabled}
        autoComplete="name"
        maxLength={200}
        onChange={setPrinted}
      />
      <TextField
        label="Title"
        size="sm"
        value={title}
        disabled={disabled}
        autoComplete="organization-title"
        maxLength={200}
        onChange={setTitle}
      />
      <Switch
        label="Include date"
        checked={showDate}
        disabled={disabled}
        onChange={setShowDate}
      />
      {showDate ? (
        <Text size="sm">
          {`Date line: ${formatBlockDate(dateIso, locale)}`}
        </Text>
      ) : null}
      <Text size="sm" tone="muted">
        The block is placed at the centre of the current page. Move or resize it
        there.
      </Text>
      <Inline>
        <Button
          variant="solid"
          tone="accent"
          icon={fieldSignature}
          disabled={disabled || !signature || !printed.trim()}
          onClick={() =>
            signature &&
            onPlace(
              {
                signature: signature.content,
                name: printed.trim(),
                title: title.trim(),
                dateIso,
                locale,
                showDate,
              },
              signature.aspect,
            )
          }
        >
          Place block
        </Button>
      </Inline>
    </Stack>
  );
};
