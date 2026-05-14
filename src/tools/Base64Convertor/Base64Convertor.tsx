import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Check, Copy } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  IconButton,
  Inline,
  Label,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@arshad-shah/cynosure-react';
import useClipboard from '../../hooks/useClipboard';

type Mode = 'encode' | 'decode';

const Base64Converter: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const { copied, copy } = useClipboard();

  useEffect(() => {
    if (!inputText) {
      setOutputText('');
      setError('');
      return;
    }
    try {
      setOutputText(mode === 'encode' ? btoa(inputText) : atob(inputText));
      setError('');
    } catch {
      setOutputText('');
      setError(
        mode === 'encode'
          ? 'Could not encode text. Please ensure it contains valid characters.'
          : 'Could not decode. Please ensure you entered valid Base64.',
      );
    }
  }, [inputText, mode]);

  const swap = () => {
    if (!outputText) return;
    setInputText(outputText);
    setMode((m) => (m === 'encode' ? 'decode' : 'encode'));
    setOutputText('');
  };

  return (
    <Card variant="elevated" size="md">
      <CardHeader>
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          variant="soft"
          colorScheme="accent"
          fullWidth
        >
          <TabsList aria-label="Encode or decode">
            <TabsTrigger value="encode">Encode</TabsTrigger>
            <TabsTrigger value="decode">Decode</TabsTrigger>
          </TabsList>
          <TabsContent value={mode} />
        </Tabs>
      </CardHeader>
      <CardBody>
        <Stack gap="5">
          <Stack gap="2">
            <Label htmlFor="b64-input">
              {mode === 'encode' ? 'Text to encode' : 'Base64 to decode'}
            </Label>
            <Textarea
              id="b64-input"
              value={inputText}
              onChange={setInputText}
              placeholder={
                mode === 'encode'
                  ? 'Enter your text…'
                  : 'Enter Base64 text…'
              }
              rows={6}
              clearable
            />
          </Stack>

          <Center>
            <IconButton
              variant="solid"
              colorScheme="accent"
              shape="pill"
              label="Swap input and output"
              icon={<ArrowRightLeft size={18} />}
              onClick={swap}
              disabled={!outputText}
            />
          </Center>

          {error ? (
            <Alert status="danger" variant="soft">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Stack gap="2">
              <Inline justify="between" align="center">
                <Text size="sm" weight="semibold">
                  {mode === 'encode' ? 'Base64 result' : 'Decoded result'}
                </Text>
                {outputText && (
                  <Button
                    variant="ghost"
                    colorScheme="neutral"
                    size="sm"
                    leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                    onClick={() => copy(outputText)}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </Inline>
              <Textarea
                aria-label="Result"
                value={outputText}
                readOnly
                rows={6}
                placeholder={
                  mode === 'encode'
                    ? 'Base64 result will appear here…'
                    : 'Decoded text will appear here…'
                }
              />
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

export default Base64Converter;
