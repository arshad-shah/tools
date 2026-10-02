import React, { useId, useState } from 'react';
import { IconFieldSignature } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Inline,
  Input,
  Label,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
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
  const id = useId();
  const [printed, setPrinted] = useState(name);
  const [title, setTitle] = useState('');
  const [showDate, setShowDate] = useState(true);
  const [dateIso] = useState(() => todayIso());
  const [locale] = useState(userLocale);

  return (
    <Stack gap="3">
      {signature ? null : (
        <Alert status="info">
          <AlertDescription>
            Make your signature in the Draw, Type, Photo or Upload tab first.
            The block uses it.
          </AlertDescription>
        </Alert>
      )}
      <Stack gap="2">
        <Label htmlFor={`${id}-name`}>Printed name</Label>
        <Input
          id={`${id}-name`}
          value={printed}
          disabled={disabled}
          autoComplete="name"
          maxLength={200}
          onChange={setPrinted}
        />
      </Stack>
      <Stack gap="2">
        <Label htmlFor={`${id}-title`}>Title</Label>
        <Input
          id={`${id}-title`}
          value={title}
          disabled={disabled}
          autoComplete="organization-title"
          maxLength={200}
          onChange={setTitle}
        />
      </Stack>
      <Inline gap="3">
        <Switch
          id={`${id}-date`}
          checked={showDate}
          disabled={disabled}
          onCheckedChange={setShowDate}
        />
        <Label htmlFor={`${id}-date`}>Include date</Label>
      </Inline>
      {showDate ? (
        <Text size="sm">
          {`Date line: ${formatBlockDate(dateIso, locale)}`}
        </Text>
      ) : null}
      <Text size="sm" tone="muted">
        The block is placed at the centre of the current page. Move or resize it
        there.
      </Text>
      <Button
        variant="primary"
        leftIcon={<IconFieldSignature size="sm" />}
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
        className="self-start"
      >
        Place block
      </Button>
    </Stack>
  );
};
