import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  Grid,
  Heading,
  Inline,
  Label,
  List,
  ListItem,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '../../components/ui';

type Mode = 'encode' | 'decode';

const URLEncoderDecoder: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!inputText) {
      setOutputText('');
      setError('');
      return;
    }
    try {
      setOutputText(
        mode === 'encode'
          ? encodeURIComponent(inputText)
          : decodeURIComponent(inputText),
      );
      setError('');
    } catch (err) {
      setError((err as Error).message);
      setOutputText('');
    }
  }, [inputText, mode]);

  const handleCopy = async () => {
    if (!outputText) return;
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Stack gap="6">
      <Card>
        <CardHeader>
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            variant="soft"
            fullWidth
          >
            <TabsList aria-label="Encode or decode">
              <TabsTrigger value="encode">Encode</TabsTrigger>
              <TabsTrigger value="decode">Decode</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardBody>
          <Stack gap="4">
            <Stack gap="2">
              <Label htmlFor="url-input">
                {mode === 'encode' ? 'Text to encode' : 'Text to decode'}
              </Label>
              <Textarea
                id="url-input"
                placeholder={
                  mode === 'encode'
                    ? 'Enter text to encode'
                    : 'Enter text to decode'
                }
                value={inputText}
                onChange={setInputText}
                rows={5}
                clearable
              />
            </Stack>

            <Inline gap="2" justify="end" wrap>
              <Button
                variant="soft"
                size="sm"
                onClick={() => {
                  setInputText('');
                  setOutputText('');
                  setError('');
                }}
              >
                Clear
              </Button>
              <Button
                variant="soft"
                size="sm"
                disabled={!outputText}
                onClick={() => setInputText(outputText)}
              >
                Use output as input
              </Button>
            </Inline>

            {error ? (
              <Alert status="danger">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <Stack gap="2">
                <Inline justify="between" align="center">
                  <Text size="sm" weight="semibold">
                    {mode === 'encode' ? 'Encoded result' : 'Decoded result'}
                  </Text>
                  {outputText && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={
                        copied ? <Check size={16} /> : <Copy size={16} />
                      }
                      onClick={handleCopy}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </Inline>
                <Textarea
                  aria-label="Result"
                  value={outputText}
                  rows={5}
                  readOnly
                />
              </Stack>
            )}
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">About URL Encoding</CardTitle>
        </CardHeader>
        <CardBody>
          <Stack gap="4">
            <Text tone="muted">
              URL encoding converts characters into a format that can be
              transmitted over the Internet. URLs can only be sent using the
              ASCII character set, so unsafe characters are replaced with a{' '}
              <Code>%</Code> followed by two hexadecimal digits.
            </Text>
            <Grid max={2} gap="4">
              <Stack gap="2">
                <Heading level={3} size="md">
                  Common encodings
                </Heading>
                <List>
                  <ListItem>
                    Space <Code>%20</Code>
                  </ListItem>
                  <ListItem>
                    ! <Code>%21</Code>
                  </ListItem>
                  <ListItem>
                    # <Code>%23</Code>
                  </ListItem>
                  <ListItem>
                    $ <Code>%24</Code>
                  </ListItem>
                  <ListItem>
                    &amp; <Code>%26</Code>
                  </ListItem>
                  <ListItem>
                    + <Code>%2B</Code>
                  </ListItem>
                </List>
              </Stack>
              <Stack gap="2">
                <Heading level={3} size="md">
                  When to use it
                </Heading>
                <List>
                  <ListItem>Building URLs with query parameters</ListItem>
                  <ListItem>Sending data in HTTP requests</ListItem>
                  <ListItem>Handling special characters in URLs</ListItem>
                  <ListItem>Creating links with non-ASCII characters</ListItem>
                </List>
              </Stack>
            </Grid>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
};

export default URLEncoderDecoder;
