import {
  Badge,
  Button,
  Card,
  CodeBlock,
  CopyButton,
  Disclosure,
  EmptyState,
  IconButton,
  Inline,
  Notice,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextArea,
} from '@arshad-shah/cynosure';
import {
  download,
  link,
  refreshCw,
  swap as swapIcon,
} from '@arshad-shah/cynosure/icons';
import React, { useMemo, useState } from 'react';
import { TextSourceActions } from '@/app/ui/text-source';
import { useTextFile } from '@/app/ui/use-text-file';
import { SendToMenu, TransformLayout } from '@/app/ui/transform';
import { saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { asUrl } from './lib/as-url';
import {
  CODECS,
  decodeUntilStable,
  getCodec,
  perLine,
  type CodecId,
} from './lib/codecs';
import { textEncoderSettings, type TextEncoderSettings } from './settings';

type Direction = TextEncoderSettings['direction'];

interface Result {
  output: string;
  error?: ToolError;
}

/** What "Try an example" encodes (or, to decode, this text encoded). */
const SAMPLE = 'Café & crème brûlée? 100% <yes> "quoted" /path?q=a b';

/**
 * Text Encoder / Decoder (redesign spec, transform pattern): pick a codec
 * and a direction; the text and the result side by side.
 */
const TextEncoderTool: React.FC = () => {
  const [settings, update] = textEncoderSettings.useSettings();
  const { direction, perLine: lines } = settings;
  const codec = getCodec(settings.codec);
  const [input, setInput] = useState('');
  // "Decode until stable": the round count for the input it was run on.
  const [stable, setStable] = useState<{
    input: string;
    output: string;
    rounds: number;
  } | null>(null);

  const result = useMemo((): Result => {
    if (!input) return { output: '' };
    const fn = direction === 'encode' ? codec.encode : codec.decode;
    try {
      return { output: (lines ? perLine(fn) : fn)(input) };
    } catch (e) {
      return { output: '', error: toToolError(e) };
    }
  }, [input, direction, codec, lines]);

  const shownStable = stable && stable.input === input ? stable : null;
  const output = shownStable ? shownStable.output : result.output;
  const url = asUrl(output);
  const encoding = direction === 'encode';

  const edit = (v: string) => {
    setInput(v);
    setStable(null);
  };
  const swap = () => {
    edit(output);
    update({ direction: encoding ? 'decode' : 'encode' });
  };
  const runStable = () => {
    try {
      const r = decodeUntilStable(codec, input);
      setStable({ input, ...r });
    } catch {
      setStable(null);
    }
  };
  const tryExample = () => {
    let text = SAMPLE;
    if (!encoding) {
      try {
        text = codec.encode(SAMPLE);
      } catch {
        // Every codec encodes the sample; keep it plain otherwise.
      }
    }
    edit(text);
  };

  useToolCommands('url-encoder-decoder', [
    {
      id: 'swap',
      label: 'Swap input and output',
      run: swap,
      enabled: !!output,
    },
    {
      id: 'stable',
      label: 'Decode until stable',
      run: runStable,
      enabled: !!input,
    },
  ]);

  const label = encoding ? 'Text to encode' : 'Text to decode';
  // A file dropped on the field opens like Open file (TextArea onFiles).
  const textFile = useTextFile({ onChange: edit });
  const inputCard = (
    <Card as="section" title="Input">
      <Stack gap="5">
        <TextArea
          onFiles={textFile.onFiles}
          label={label}
          labelHidden
          rows={5}
          maxRows={18}
          spellCheck={false}
          placeholder={
            encoding
              ? 'Type or paste text to encode.'
              : `Paste text encoded with ${codec.label}.`
          }
          value={input}
          onChange={edit}
          error={result.error ? 'This text cannot be decoded.' : undefined}
        />
        <TextSourceActions
          value={input}
          onChange={edit}
          label={label}
          onExample={input ? undefined : tryExample}
          handoff={(p) =>
            p.kind === 'text' &&
            (p.mime === 'text/plain' || p.mime === 'text/uri-list')
          }
        />
      </Stack>
    </Card>
  );

  const name = encoding ? 'encoded.txt' : 'decoded.txt';
  const outputCard = (
    <Card
      as="section"
      title="Output"
      actions={
        output ? (
          <Button size="sm" variant="ghost" icon={swapIcon} onClick={swap}>
            Swap
          </Button>
        ) : undefined
      }
    >
      {!input ? (
        <EmptyState
          icon={link}
          title={encoding ? 'Nothing to encode yet' : 'Nothing to decode yet'}
          description={`Type or paste text to ${direction} it with ${codec.label}.`}
        />
      ) : result.error ? (
        <Notice
          tone="danger"
          title={`Could not ${direction} with ${codec.label}`}
        >
          {result.error.message}
        </Notice>
      ) : (
        <Stack gap="5">
          <CodeBlock
            title={encoding ? 'Encoded' : 'Decoded'}
            code={output}
            wrap
            copyable={false}
            actions={
              <Inline gap="1">
                <CopyButton
                  size="sm"
                  value={output}
                  labels={{ copy: 'Copy the output' }}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  tone="neutral"
                  icon={download}
                  label="Download the output"
                  onClick={() =>
                    saveBlob(new Blob([output], { type: 'text/plain' }), name)
                  }
                />
              </Inline>
            }
          />
          {!encoding || shownStable || url ? (
            <Inline gap="3" align="center" wrap>
              {!encoding ? (
                <Button variant="soft" icon={refreshCw} onClick={runStable}>
                  Decode until stable
                </Button>
              ) : null}
              {shownStable ? (
                <Badge tone="accent">
                  {`Decoded in ${shownStable.rounds} round${shownStable.rounds === 1 ? '' : 's'}`}
                </Badge>
              ) : null}
              {url ? (
                <SendToMenu
                  label="Open URL in"
                  sourceTool="url-encoder-decoder"
                  payload={() => ({
                    kind: 'text',
                    mime: 'text/uri-list',
                    text: url,
                    sourceTool: 'url-encoder-decoder',
                  })}
                />
              ) : null}
            </Inline>
          ) : null}
        </Stack>
      )}
    </Card>
  );

  return (
    <Stack gap="6">
      <Inline gap="5" align="end" wrap>
        <Select
          label="Codec"
          width="md"
          value={codec.id}
          onChange={(v) => {
            setStable(null);
            update({ codec: v as CodecId });
          }}
          options={CODECS.map((c) => ({ value: c.id, label: c.label }))}
        />
        <SegmentedControl
          label="Direction"
          value={direction}
          onChange={(d) => {
            setStable(null);
            update({ direction: d as Direction });
          }}
          options={[
            { value: 'encode', label: 'Encode' },
            { value: 'decode', label: 'Decode' },
          ]}
        />
        <Switch
          label="Each line separately"
          checked={lines}
          onChange={(v) => update({ perLine: v })}
        />
      </Inline>
      <TransformLayout start={inputCard} end={outputCard} />
      <Disclosure summary={`How ${codec.label} works`} variant="line">
        <Text as="p" tone="muted">
          {codec.about}
        </Text>
      </Disclosure>
    </Stack>
  );
};

export default TextEncoderTool;
