import React, { useMemo, useState } from 'react';
import {
  IconArrowRightLeft,
  IconCheck,
  IconCopy,
  IconDownload,
  IconFileUp,
  IconX,
} from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  FilePicker,
  IconButton,
  Inline,
  Label,
  Stack,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { utf8Encode } from '@/shared/lib/encoding';
import { toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import {
  PREVIEW_LENGTH,
  decodeInput,
  encodeBytes,
  encodeText,
  guessFileType,
  preview,
} from './lib/convert';

const previewNote = (total: number) =>
  `Showing the first ${formatBytes(PREVIEW_LENGTH, 0)} of ${total.toLocaleString()} characters. Copy and Download use the full result.`;

type Mode = 'encode' | 'decode';

interface LoadedSource {
  name: string;
  mime: string;
  bytes: Uint8Array;
}

interface DecodedFile {
  bytes: Uint8Array;
  mime: string;
  ext: string;
}

interface Output {
  text: string;
  dataUri?: string;
  /** Decoded bytes, offered as a download. */
  file?: DecodedFile;
  /** True when the decoded bytes are not text. */
  binary?: boolean;
  error?: string;
}

const Base64Converter: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<LoadedSource | null>(null);
  const [fileError, setFileError] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const [urlSafe, setUrlSafe] = useState(false);
  const { copiedKey, copy } = useClipboard();

  const output = useMemo((): Output => {
    try {
      if (mode === 'encode') {
        if (file) {
          const { base64, dataUri } = encodeBytes(file.bytes, file.mime, {
            urlSafe,
          });
          return { text: base64, dataUri };
        }
        return { text: inputText ? encodeText(inputText, { urlSafe }) : '' };
      }
      if (!inputText.trim()) return { text: '' };
      const decoded = decodeInput(inputText);
      const type: DecodedFile = {
        bytes: decoded.bytes,
        ...guessFileType(decoded.bytes, decoded.mime),
      };
      return decoded.text === null
        ? { text: '', file: type, binary: true }
        : { text: decoded.text, file: type };
    } catch (e) {
      return { text: '', error: toToolError(e).message };
    }
  }, [mode, file, inputText, urlSafe]);

  const loadFile = async (files: File[]) => {
    const f = files[0];
    setFileError('');
    try {
      const bytes = await readBytes(f);
      setFile({
        name: f.name,
        bytes,
        mime: f.type || guessFileType(bytes).mime,
      });
    } catch (e) {
      setFileError(toToolError(e, `Could not read ${f.name}`).message);
    }
  };

  const swap = () => {
    if (!output.text) return;
    setInputText(output.text);
    setFile(null);
    setMode((m) => (m === 'encode' ? 'decode' : 'encode'));
  };

  const download = () => {
    if (mode === 'encode') {
      saveBlob(
        utf8Encode(output.text),
        `${file ? file.name : 'encoded'}.base64.txt`,
        'text/plain',
      );
    } else if (output.file) {
      saveBlob(
        output.file.bytes,
        `decoded.${output.file.ext}`,
        output.file.mime,
      );
    }
  };

  const copyButton = (text: string, key: string, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Copy ${label}`}
      leftIcon={
        copiedKey === key ? <IconCheck size="sm" /> : <IconCopy size="sm" />
      }
      onClick={() => void copy(text, key)}
    >
      {copiedKey === key ? 'Copied' : 'Copy'}
    </Button>
  );

  const hasOutput = !!output.text || !!output.binary;
  // Huge results are not rendered whole: a textarea with tens of MB of text
  // freezes the page. Copy and Download still use the full value.
  const resultPreview = preview(output.text);
  const dataUriPreview = preview(output.dataUri ?? '');

  return (
    <Card>
      <CardHeader>
        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as Mode);
            setFile(null);
          }}
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
        <Stack gap="5">
          {mode === 'encode' ? (
            <Inline justify="between" align="center" wrap>
              <Inline gap="2" align="center">
                <Switch
                  id="b64-url-safe"
                  checked={urlSafe}
                  onCheckedChange={setUrlSafe}
                  aria-label="URL-safe"
                />
                <Label htmlFor="b64-url-safe">URL-safe (no padding)</Label>
              </Inline>
              <FilePicker onFiles={(f) => void loadFile(f)}>
                {(open) => (
                  <Button
                    variant="soft"
                    size="sm"
                    leftIcon={<IconFileUp size="sm" />}
                    onClick={open}
                  >
                    Encode a file
                  </Button>
                )}
              </FilePicker>
            </Inline>
          ) : (
            <Text size="sm" tone="subtle">
              Accepts standard or URL-safe Base64 and data URIs.
            </Text>
          )}

          {fileError && (
            <Alert status="danger">
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}

          {file ? (
            <Inline justify="between" align="center">
              <Text size="sm">
                {file.name} ({formatBytes(file.bytes.length)})
              </Text>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<IconX size="sm" />}
                onClick={() => setFile(null)}
              >
                Remove file
              </Button>
            </Inline>
          ) : (
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
                    : 'Enter Base64 text or a data URI'
                }
                rows={6}
                clearable
              />
            </Stack>
          )}

          <Center>
            <IconButton
              variant="solid"
              label="Swap input and output"
              icon={<IconArrowRightLeft size="md" />}
              onClick={swap}
              disabled={!output.text}
            />
          </Center>

          {output.error ? (
            <Alert status="danger">
              <AlertDescription>{output.error}</AlertDescription>
            </Alert>
          ) : (
            <Stack gap="4">
              <Stack gap="2">
                <Inline justify="between" align="center">
                  <Text size="sm" weight="semibold">
                    {mode === 'encode' ? 'Base64 result' : 'Decoded result'}
                  </Text>
                  <Inline gap="1" align="center">
                    {hasOutput && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<IconDownload size="sm" />}
                        onClick={download}
                      >
                        {mode === 'encode' ? 'Download .txt' : 'Download file'}
                      </Button>
                    )}
                    {output.text && copyButton(output.text, 'result', 'result')}
                  </Inline>
                </Inline>
                {output.binary && output.file ? (
                  <Alert status="info">
                    <AlertDescription>
                      Binary data ({formatBytes(output.file.bytes.length)},{' '}
                      {output.file.mime}). Download it as a file.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Textarea
                    aria-label="Result"
                    value={resultPreview.text}
                    readOnly
                    rows={6}
                    placeholder={
                      mode === 'encode'
                        ? 'Base64 result will appear here…'
                        : 'Decoded text will appear here…'
                    }
                  />
                )}
                {resultPreview.truncated && !output.binary && (
                  <Text size="xs" tone="subtle">
                    {previewNote(output.text.length)}
                  </Text>
                )}
              </Stack>

              {output.dataUri && (
                <Stack gap="2">
                  <Inline justify="between" align="center">
                    <Text size="sm" weight="semibold">
                      Data URI
                    </Text>
                    {copyButton(output.dataUri, 'data-uri', 'data URI')}
                  </Inline>
                  <Textarea
                    aria-label="Data URI"
                    value={dataUriPreview.text}
                    readOnly
                    rows={4}
                  />
                  {dataUriPreview.truncated && (
                    <Text size="xs" tone="subtle">
                      {previewNote(output.dataUri.length)}
                    </Text>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

export default Base64Converter;
