import React from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Inline,
  Label,
  Stack,
  Textarea,
} from '@/shared/ui';

export const TextUrlForm: React.FC<{
  text: string;
  setText: (text: string) => void;
  isUrl: boolean;
}> = ({ text, setText, isUrl }) => {
  const isValidUrl = () => {
    if (!isUrl || !text) return true;
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };
  const invalid = isUrl && text.length > 0 && !isValidUrl();
  return (
    <Stack gap="3">
      <Stack gap="2">
        <Label htmlFor="qr-text-input">
          {isUrl ? 'URL address' : 'Text content'}
        </Label>
        <Textarea
          id="qr-text-input"
          value={text}
          onChange={setText}
          rows={5}
          invalid={invalid}
          placeholder={isUrl ? 'https://example.com' : 'Enter text here…'}
          aria-label={isUrl ? 'URL' : 'Text content'}
        />
        {!isUrl && text.length > 0 && (
          <Inline gap="2" wrap>
            <Badge variant="soft" tone="accent" size="xs">
              {text.length} characters
            </Badge>
            <Badge variant="soft" tone="accent" size="xs">
              {text.split(/\s+/).filter((w) => w.length > 0).length} words
            </Badge>
          </Inline>
        )}
      </Stack>
      {invalid && (
        <Alert status="danger">
          <AlertDescription>
            Please enter a valid URL (e.g. https://example.com).
          </AlertDescription>
        </Alert>
      )}
      {isUrl && text && text.startsWith('http://') && (
        <Alert status="warning">
          <AlertDescription>
            Consider using HTTPS for better security.
          </AlertDescription>
        </Alert>
      )}
    </Stack>
  );
};
