import React, { useMemo, useState } from 'react';
import { IconArrowRightLeft, IconRefreshCw } from '@/shared/ui/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Label,
  PrivacyNote,
  SegmentedControl,
  Select,
  SendToMenu,
  Stack,
  Switch,
  Text,
  TextInputPanel,
  type CodeMarker,
} from '@/shared/ui';
import { offsetToLineCol } from '@/shared/lib/data-formats/json-locate';
import { toToolError } from '@/shared/lib/errors';
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
  error?: string;
  markers?: CodeMarker[];
}

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
      const err = toToolError(e);
      const at =
        e instanceof CodecError
          ? e.position
          : err.cause instanceof CodecError
            ? err.cause.position
            : null;
      if (at === null || lines) return { output: '', error: err.message };
      const { line, column } = offsetToLineCol(input, at);
      return {
        output: '',
        error: err.message,
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

  return (
    <Stack gap="4">
      <Card>
        <CardBody>
          <Inline gap="4" align="end" wrap>
            <Stack gap="1">
              <Label htmlFor="text-codec">Codec</Label>
              <div className="w-64">
                <Select
                  id="text-codec"
                  value={codec.id}
                  onValueChange={(v) => {
                    setStable(null);
                    update({ codec: v as CodecId });
                  }}
                  items={CODECS.map((c) => ({ value: c.id, label: c.label }))}
                />
              </div>
            </Stack>
            <SegmentedControl<Direction>
              label="Direction"
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
            <Inline gap="2" align="center">
              <Switch
                id="text-per-line"
                checked={lines}
                onCheckedChange={(v) => update({ perLine: v })}
                aria-label="Each line separately"
              />
              <Label htmlFor="text-per-line">Each line separately</Label>
            </Inline>
          </Inline>
        </CardBody>
      </Card>

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
      />

      <Inline gap="2" align="center" wrap justify="center">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<IconArrowRightLeft size="sm" />}
          onClick={swap}
          disabled={!output}
        >
          Swap
        </Button>
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
        {shownStable && (
          <Badge variant="soft" tone="accent" size="sm">
            {`Decoded in ${shownStable.rounds} round${shownStable.rounds === 1 ? '' : 's'}`}
          </Badge>
        )}
      </Inline>

      {result.error && (
        <Alert status="danger">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}

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
