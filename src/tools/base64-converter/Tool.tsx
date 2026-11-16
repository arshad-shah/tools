import {
  Button,
  Card,
  CodeBlock,
  CopyButton,
  EmptyState,
  FileDrop,
  IconButton,
  Inline,
  Notice,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextArea,
} from '@arshad-shah/cynosure';
import {
  close,
  download,
  fileCode,
  sparkles,
  swap as swapIcon,
} from '@arshad-shah/cynosure/icons';
import React, { useMemo, useState } from 'react';
import { TextSourceActions } from '@/app/ui/text-source';
import { useTextFile } from '@/app/ui/use-text-file';
import { TransformLayout } from '@/app/ui/transform';
import { readClipboardText } from '@/shared/lib/clipboard';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
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
  preview,
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
  error?: ToolError;
}

const EXAMPLES: Record<Mode, string> = {
  encode: 'Hello, world! Base64 turns any bytes into plain text.',
  // {"name":"Ada Lovelace","role":"admin","active":true}
  decode:
    'eyJuYW1lIjoiQWRhIExvdmVsYWNlIiwicm9sZSI6ImFkbWluIiwiYWN0aXZlIjp0cnVlfQ==',
};

/** A long result as a CodeBlock preview; Copy and Download take all of it. */
function ResultBlock({
  title,
  text,
  name,
}: {
  title: string;
  text: string;
  name: string;
}) {
  const shown = preview(text);
  return (
    <Stack gap="3">
      <CodeBlock
        title={title}
        code={shown.text}
        wrap
        copyable={false}
        actions={
          <Inline gap="1">
            <CopyButton
              size="sm"
              value={text}
              labels={{ copy: `Copy ${title}` }}
            />
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={download}
              label={`Download ${title}`}
              onClick={() =>
                saveBlob(new Blob([text], { type: 'text/plain' }), name)
              }
            />
          </Inline>
        }
      />
      {shown.truncated ? (
        <Text size="sm" tone="muted">
          {`Showing the first ${formatBytes(shown.text.length)} of ${formatBytes(text.length)}. Copy and Download take all of it.`}
        </Text>
      ) : null}
    </Stack>
  );
}

/**
 * Base64 Encoder / Decoder (redesign spec, transform pattern): text or a
 * file in, Base64 and a data URI out; or Base64 in, the bytes out with a
 * look at what they are.
 */
const Base64Converter: React.FC = () => {
  const [settings, update] = base64Settings.useSettings();
  const { mode, urlSafe, padding, wrap76 } = settings;
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<LoadedSource | null>(null);
  const [fileError, setFileError] = useState<ToolError | null>(null);

  const output = useMemo((): Output => {
    const opts = { urlSafe, padding, wrap76 };
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
      const decodedFile: DecodedFile = {
        bytes: d.bytes,
        ...guessFileType(d.bytes, d.mime),
      };
      return {
        text: d.text ?? '',
        decoded: {
          file: decodedFile,
          text: d.text,
          insight: describeBytes(d.bytes),
        },
      };
    } catch (e) {
      return { text: '', error: toToolError(e) };
    }
  }, [mode, file, inputText, urlSafe, padding, wrap76]);

  const loadFile = async (f: File) => {
    setFileError(null);
    try {
      const bytes = await readBytes(f);
      setFile({
        name: f.name,
        bytes,
        mime: f.type || guessFileType(bytes).mime,
      });
      update({ mode: 'encode' });
    } catch (e) {
      setFileError(toToolError(e, `Could not read ${f.name}`));
    }
  };
  // A file dropped on a hub is encoded like a picked one.
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
  const tryExample = () => {
    setFile(null);
    setInputText(EXAMPLES[mode]);
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

  const encoding = mode === 'encode';
  const empty = !file && !inputText.trim();

  // A file dropped on the field opens like Open file (TextArea onFiles).
  const textFile = useTextFile({
    onChange: setInputText,
    onFile: (f) => {
      if (!encoding) return false;
      void loadFile(f);
      return true;
    },
  });
  const input = (
    <Card as="section" title={encoding ? 'Text or file' : 'Base64'}>
      <Stack gap="5">
        {fileError ? (
          <Notice tone="danger" title="Could not open the file">
            {fileError.message}
          </Notice>
        ) : null}
        {file ? (
          <Inline gap="3" align="center" justify="between" wrap>
            <Stack gap="1" minSize="0" shrink>
              <Text weight="medium" truncate>
                {file.name}
              </Text>
              <Text size="sm" tone="muted">
                {`${formatBytes(file.bytes.length)}, ${file.mime}`}
              </Text>
            </Stack>
            <Button
              size="sm"
              variant="soft"
              tone="neutral"
              icon={close}
              onClick={() => setFile(null)}
            >
              Remove file
            </Button>
          </Inline>
        ) : (
          <TextArea
            onFiles={textFile.onFiles}
            label={encoding ? 'Text to encode' : 'Base64 to decode'}
            labelHidden
            rows={6}
            maxRows={18}
            spellCheck={false}
            placeholder={
              encoding
                ? 'Type or paste text to encode.'
                : 'Paste Base64 (standard or URL-safe) or a data URI.'
            }
            value={inputText}
            onChange={setInputText}
          />
        )}
        {file ? null : (
          <TextSourceActions
            value={inputText}
            onChange={setInputText}
            label={encoding ? 'Text to encode' : 'Base64 to decode'}
            onExample={tryExample}
            onFile={(f) => {
              if (!encoding) return false;
              void loadFile(f);
              return true;
            }}
          />
        )}
        {encoding && !file ? (
          <FileDrop
            size="sm"
            hint="Or drop any file: it is encoded as Base64 and a data URI."
            labels={{ chooseOne: 'Encode a file' }}
            onFiles={(files) => files[0] && void loadFile(files[0])}
          />
        ) : null}
      </Stack>
    </Card>
  );

  const options = encoding ? (
    <Inline gap="5" wrap role="group" aria-label="Encoding options">
      <Switch
        label="URL-safe"
        checked={urlSafe}
        onChange={(v) => update({ urlSafe: v, padding: !v })}
      />
      <Switch
        label="Padding"
        checked={padding}
        onChange={(v) => update({ padding: v })}
      />
      <Switch
        label="Wrap at 76"
        checked={wrap76}
        onChange={(v) => update({ wrap76: v })}
      />
    </Inline>
  ) : null;

  const result = output.error ? (
    <Notice tone="danger" title="Could not decode this Base64">
      {output.error.message}
    </Notice>
  ) : output.decoded ? (
    <DecodedView
      file={output.decoded.file}
      text={output.decoded.text}
      insight={output.decoded.insight}
    />
  ) : output.text ? (
    <Stack gap="5">
      <ResultBlock
        title="Base64"
        text={output.text}
        name={deriveFilename(file?.name ?? 'encoded', 'base64', 'txt')}
      />
      {output.dataUri ? (
        <ResultBlock
          title="Data URI"
          text={output.dataUri}
          name={deriveFilename(file?.name ?? 'file', 'datauri', 'txt')}
        />
      ) : null}
    </Stack>
  ) : null;

  const outputCard = (
    <Card
      as="section"
      title={encoding ? 'Encoded' : 'Decoded'}
      actions={
        <Button
          size="sm"
          variant="ghost"
          icon={swapIcon}
          disabled={!output.text}
          onClick={swap}
        >
          Swap
        </Button>
      }
    >
      <Stack gap="5">
        {options}
        {empty ? (
          <EmptyState
            icon={fileCode}
            title={encoding ? 'Nothing to encode yet' : 'Nothing to decode yet'}
            description={
              encoding
                ? 'Type text or drop a file to see its Base64 and data URI.'
                : 'Paste Base64 or a data URI to see the bytes and what they are.'
            }
            actions={
              <Button variant="soft" icon={sparkles} onClick={tryExample}>
                Try an example
              </Button>
            }
          />
        ) : (
          result
        )}
      </Stack>
    </Card>
  );

  return (
    <Stack gap="6">
      <Inline>
        <SegmentedControl
          label="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: 'encode', label: 'Encode' },
            { value: 'decode', label: 'Decode' },
          ]}
        />
      </Inline>
      <TransformLayout start={input} end={outputCard} />
    </Stack>
  );
};

export default Base64Converter;
