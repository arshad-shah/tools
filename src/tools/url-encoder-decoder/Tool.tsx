import React, { useMemo, useState } from 'react';
import { IconArrowRightLeft, IconRefreshCw } from '@/shared/ui/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  ErrorState,
  Inline,
  Label,
  PaneTabs,
  PrivacyNote,
  SegmentedControl,
  Select,
  SendToMenu,
  Stack,
  SwitchField,
  ControlBar,
  Text,
  TextInputPanel,
  usePaneTab,
  type CodeMarker,
} from '@/shared/ui';
import { offsetToLineCol } from '@/shared/lib/data-formats/json-locate';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { asUrl } from './lib/as-url';
import {
  CODECS,
  CodecError,
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
  markers?: CodeMarker[];
}

const TextEncoderTool: React.FC = () => {
  const [settings, update] = textEncoderSettings.useSettings();
  const { direction, perLine: lines } = settings;
  const codec = getCodec(settings.codec);
  const [input, setInput] = useState('');
  const tab = usePaneTab('url-encoder-decoder', 'input');
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
      const err = toToolError(e);
      const at =
        e instanceof CodecError
          ? e.position
          : err.cause instanceof CodecError
            ? err.cause.position
            : null;
      if (at === null || lines) return { output: '', error: err };
      const { line, column } = offsetToLineCol(input, at);
      return {
        output: '',
        error: err,
        markers: [{ line, column, message: err.message, severity: 'error' }],
      };
    }
  }, [input, direction, codec, lines]);

  const shownStable = stable && stable.input === input ? stable : null;
  const output = shownStable ? shownStable.output : result.output;
  const url = asUrl(output);

  const swap = () => {
    setInput(output);
    setStable(null);
    update({ direction: direction === 'encode' ? 'decode' : 'encode' });
  };
  const runStable = () => {
    try {
      const r = decodeUntilStable(codec, input);
      setStable({ input, ...r });
      tab.show('output');
    } catch {
      setStable(null);
    }
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

  const inputPane = (
    <TextInputPanel
      label={direction === 'encode' ? 'Text to encode' : 'Text to decode'}
      value={input}
      onChange={(v) => {
        setInput(v);
        setStable(null);
      }}
      language="plain"
      wrap
      markers={result.markers}
      minHeight={140}
      handoff={(p) =>
        p.kind === 'text' &&
        (p.mime === 'text/plain' || p.mime === 'text/uri-list')
      }
    />
  );

  const outputPane = (
    <Stack gap="3">
      {result.error ? (
        <ErrorState
          error={result.error}
          title={`Could not ${direction} with ${codec.label}`}
        />
      ) : (
        <TextInputPanel
          label="Output"
          value={output}
          onChange={() => {}}
          language="plain"
          readOnly
          wrap
          downloadName={direction === 'encode' ? 'encoded.txt' : 'decoded.txt'}
          minHeight={140}
        />
      )}
      {url && (
        <Inline gap="2" align="center">
          <Text size="sm" tone="subtle">
            The output is a URL.
          </Text>
          <SendToMenu
            payload={() => ({
              kind: 'text',
              mime: 'text/uri-list',
              text: url,
              sourceTool: 'url-encoder-decoder',
            })}
            sourceTool="url-encoder-decoder"
            label="Open URL in"
            size="sm"
          />
        </Inline>
      )}
    </Stack>
  );

  return (
    <Stack gap="4">
      <ControlBar
        start={
          <>
            <Inline gap="2" align="center" wrap={false}>
              <Label htmlFor="text-codec">Codec</Label>
              <div className="w-56">
                <Select
                  id="text-codec"
                  size="sm"
                  value={codec.id}
                  onValueChange={(v) => {
                    setStable(null);
                    update({ codec: v as CodecId });
                  }}
                  items={CODECS.map((c) => ({ value: c.id, label: c.label }))}
                />
              </div>
            </Inline>
            <SegmentedControl<Direction>
              label="Direction"
              size="sm"
              value={direction}
              onChange={(d) => {
                setStable(null);
                update({ direction: d });
              }}
              options={[
                { value: 'encode', label: 'Encode' },
                { value: 'decode', label: 'Decode' },
              ]}
            />
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<IconArrowRightLeft size="sm" />}
              onClick={swap}
              disabled={!output}
            >
              Swap
            </Button>
          </>
        }
        end={
          <>
            {shownStable && (
              <Badge variant="soft" tone="accent" size="sm">
                {`Decoded in ${shownStable.rounds} round${shownStable.rounds === 1 ? '' : 's'}`}
              </Badge>
            )}
            {direction === 'decode' && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconRefreshCw size="sm" />}
                onClick={runStable}
                disabled={!input || !!result.error}
              >
                Decode until stable
              </Button>
            )}
            <SwitchField
              label="Each line separately"
              checked={lines}
              onCheckedChange={(v) => update({ perLine: v })}
            />
          </>
        }
      />

      <PaneTabs
        id="url-encoder-decoder"
        label="Text encoder panes"
        value={tab.value}
        onValueChange={tab.show}
        panes={[
          { id: 'input', label: 'Input', content: inputPane },
          {
            id: 'output',
            label: 'Output',
            content: outputPane,
            changeKey: result.error?.message ?? output,
          },
        ]}
      />

      <Accordion type="single">
        <AccordionItem value="about">
          <AccordionTrigger>How this codec works</AccordionTrigger>
          <AccordionContent>
            <Text size="sm">{codec.about}</Text>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <PrivacyNote variant="local" />
    </Stack>
  );
};

export default TextEncoderTool;
