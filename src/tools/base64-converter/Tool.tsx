import React, { useMemo, useState } from 'react';
import { IconArrowRightLeft, IconX } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Inline,
  Label,
  PrivacyNote,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInputPanel,
} from '@/shared/ui';
import { readClipboardText } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { DecodedView, type DecodedFile } from './components/DecodedView';
import {
  decodeInput,
  encodeBytes,
  encodeText,
  guessFileType,
} from './lib/convert';
import { describeBytes, type BytesInsight } from './lib/insight';
import { base64Settings, type Base64Settings } from './settings';

type Mode = Base64Settings['mode'];

interface LoadedSource {
  name: string;
  mime: string;
  bytes: Uint8Array;
}

interface Output {
  text: string;
  dataUri?: string;
  decoded?: { file: DecodedFile; text: string | null; insight: BytesInsight };
  error?: string;
}

const OptionSwitch: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
}> = ({ id, label, checked, onChange }) => (
  <Inline gap="2" align="center">
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
    />
    <Label htmlFor={id}>{label}</Label>
  </Inline>
);

const Base64Converter: React.FC = () => {
  const [settings, update] = base64Settings.useSettings();
  const { mode, urlSafe, padding, wrap76 } = settings;
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<LoadedSource | null>(null);
  const [fileError, setFileError] = useState('');

  const opts = { urlSafe, padding, wrap76 };
  const output = useMemo((): Output => {
    try {
      if (mode === 'encode') {
        if (file) {
          const { base64, dataUri } = encodeBytes(file.bytes, file.mime, opts);
          return { text: base64, dataUri };
        }
        return { text: inputText ? encodeText(inputText, opts) : '' };
      }
      if (!inputText.trim()) return { text: '' };
      const d = decodeInput(inputText);
      const file2: DecodedFile = {
        bytes: d.bytes,
        ...guessFileType(d.bytes, d.mime),
      };
      return {
        text: d.text ?? '',
        decoded: { file: file2, text: d.text, insight: describeBytes(d.bytes) },
      };
    } catch (e) {
      return { text: '', error: toToolError(e).message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, file, inputText, urlSafe, padding, wrap76]);

  const loadFile = async (f: File) => {
    setFileError('');
    try {
      const bytes = await readBytes(f);
      setFile({
        name: f.name,
        bytes,
        mime: f.type || guessFileType(bytes).mime,
      });
      update({ mode: 'encode' });
    } catch (e) {
      setFileError(toToolError(e, `Could not read ${f.name}`).message);
    }
  };
  // A file dropped on a hub is encoded like a picked one (spec §5.3).
  useHandoffFiles((files) => void loadFile(files[0]));

  const setMode = (m: Mode) => {
    update({ mode: m });
    setFile(null);
  };
  const swap = () => {
    if (!output.text) return;
    setInputText(output.text);
    setFile(null);
    update({ mode: mode === 'encode' ? 'decode' : 'encode' });
  };
  const fromClipboard = async (m: Mode) => {
    try {
      const text = await readClipboardText();
      setFile(null);
      setInputText(text);
      update({ mode: m });
    } catch (e) {
      notify.error(toToolError(e, 'Could not read the clipboard').message);
    }
  };

  useToolCommands('base64-converter', [
    {
      id: 'encode-clipboard',
      label: 'Encode clipboard',
      run: () => void fromClipboard('encode'),
    },
    {
      id: 'decode-clipboard',
      label: 'Decode clipboard',
      run: () => void fromClipboard('decode'),
    },
    {
      id: 'swap',
      label: 'Swap input and output',
      run: swap,
      enabled: !!output.text,
    },
  ]);

  return (
    <Stack gap="4">
      <Card>
        <CardBody>
          <Stack gap="4">
            <Inline justify="between" align="center" wrap gap="3">
              <SegmentedControl<Mode>
                label="Mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'encode', label: 'Encode' },
                  { value: 'decode', label: 'Decode' },
                ]}
              />
              {mode === 'encode' && (
                <Inline gap="4" align="center" wrap>
                  <OptionSwitch
                    id="b64-url-safe"
                    label="URL-safe"
                    checked={urlSafe}
                    onChange={(v) => update({ urlSafe: v, padding: !v })}
                  />
                  <OptionSwitch
                    id="b64-padding"
                    label="Padding"
                    checked={padding}
                    onChange={(v) => update({ padding: v })}
                  />
                  <OptionSwitch
                    id="b64-wrap"
                    label="Wrap at 76"
                    checked={wrap76}
                    onChange={(v) => update({ wrap76: v })}
                  />
                </Inline>
              )}
            </Inline>

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
              <TextInputPanel
                label={
                  mode === 'encode' ? 'Text to encode' : 'Base64 to decode'
                }
                value={inputText}
                onChange={setInputText}
                language="plain"
                wrap
                acceptBinary
                placeholder={
                  mode === 'encode'
                    ? 'Type text, or open or drop any file'
                    : 'Paste Base64 (standard or URL-safe) or a data URI'
                }
                onFile={(f) => {
                  if (mode !== 'encode') return false;
                  void loadFile(f);
                  return true;
                }}
              />
            )}

            <Inline justify="center">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconArrowRightLeft size="sm" />}
                onClick={swap}
                disabled={!output.text}
              >
                Swap
              </Button>
            </Inline>

            {output.error ? (
              <Alert status="danger">
                <AlertDescription>{output.error}</AlertDescription>
              </Alert>
            ) : output.decoded ? (
              <DecodedView
                file={output.decoded.file}
                text={output.decoded.text}
                insight={output.decoded.insight}
              />
            ) : (
              <Stack gap="4">
                <TextInputPanel
                  label="Result"
                  value={output.text}
                  onChange={() => {}}
                  language="plain"
                  readOnly
                  wrap
                  downloadName={`${file ? file.name : 'encoded'}.base64.txt`}
                  maxHeight={420}
                />
                {output.dataUri && (
                  <TextInputPanel
                    label="Data URI"
                    value={output.dataUri}
                    onChange={() => {}}
                    language="plain"
                    readOnly
                    wrap
                    downloadName={`${file?.name ?? 'file'}.datauri.txt`}
                    maxHeight={240}
                  />
                )}
              </Stack>
            )}
          </Stack>
        </CardBody>
      </Card>
      <PrivacyNote variant="local" />
    </Stack>
  );
};

export default Base64Converter;
