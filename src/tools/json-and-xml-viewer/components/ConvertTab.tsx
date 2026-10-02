import { useEffect, useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import {
  Alert,
  Input,
  Inline,
  Label,
  SegmentedControl,
  Select,
  SendToMenu,
  Stack,
  Switch,
  TextInputPanel,
} from '@/shared/ui';
import { convert, escapeJsonString, unescapeJsonString } from '../lib/convert';
import { inferJsonSchema, inferTypeScript } from '../lib/infer';
import { TARGETS, type ConvertTabTarget } from '../lib/targets';
import { viewerSettings } from '../settings';

const INDENTS = [
  { value: '2', label: '2 spaces' },
  { value: '4', label: '4 spaces' },
  { value: 'tab', label: 'Tab' },
];
const DELIMITERS = [
  { value: ',', label: 'Comma' },
  { value: ';', label: 'Semicolon' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe' },
];

export interface ConvertTabProps {
  value: unknown;
  xml: Document | null;
  /** The editor text, for escape and unescape. */
  text: string;
  fileBase: string;
  sourceTool: string;
}

async function produce(
  target: ConvertTabTarget,
  p: Pick<ConvertTabProps, 'value' | 'xml' | 'text'>,
  opts: {
    indent: number | 'tab';
    rootName: string;
    csvDelimiter: string;
    sortKeys: boolean;
  },
): Promise<string> {
  if (target === 'escape') return escapeJsonString(p.text);
  if (target === 'unescape') return unescapeJsonString(p.text);
  if (target === 'ts' || target === 'schema') {
    const json = p.xml ? JSON.parse(await convert(p.xml, 'json-min')) : p.value;
    return target === 'ts'
      ? inferTypeScript(json)
      : JSON.stringify(inferJsonSchema(json), null, 2) + '\n';
  }
  return convert(p.xml ?? p.value, target, opts);
}

/** The Convert tab (spec §7.2): live conversion to other formats and types. */
export function ConvertTab(props: ConvertTabProps) {
  const [settings, update] = viewerSettings.useSettings();
  const [target, setTarget] = useState<ConvertTabTarget>('yaml');
  const [rootName, setRootName] = useState('root');
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const [sortKeys, setSortKeys] = useState(false);
  const [out, setOut] = useState<{ text: string; error: string | null }>({
    text: '',
    error: null,
  });
  const indent: number | 'tab' =
    settings.indent === 0 ? 'tab' : settings.indent;
  const { value, xml, text } = props;

  useEffect(() => {
    let live = true;
    produce(
      target,
      { value, xml, text },
      { indent, rootName, csvDelimiter, sortKeys },
    ).then(
      (t) => live && setOut({ text: t, error: null }),
      (e: unknown) =>
        live && setOut({ text: '', error: toToolError(e).message }),
    );
    return () => {
      live = false;
    };
  }, [target, value, xml, text, indent, rootName, csvDelimiter, sortKeys]);

  const info = TARGETS[target];
  return (
    <Stack gap="2" className="h-full min-h-0">
      <SegmentedControl<ConvertTabTarget>
        label="Convert to"
        size="sm"
        value={target}
        onChange={setTarget}
        options={(Object.keys(TARGETS) as ConvertTabTarget[]).map((t) => ({
          value: t,
          label: TARGETS[t].label,
        }))}
      />
      <Inline gap="3" wrap>
        <Inline gap="2">
          <Label htmlFor="json-xml-indent">Indent</Label>
          <Select
            id="json-xml-indent"
            className="w-28"
            value={indent === 'tab' ? 'tab' : String(indent)}
            onValueChange={(v) =>
              update({ indent: v === 'tab' ? 0 : Number(v) })
            }
            items={INDENTS}
          />
        </Inline>
        {target === 'xml' && !xml ? (
          <Inline gap="2">
            <Label htmlFor="json-xml-root">Root name</Label>
            <Input
              id="json-xml-root"
              className="w-32"
              value={rootName}
              onChange={setRootName}
            />
          </Inline>
        ) : null}
        {target === 'csv' ? (
          <Inline gap="2">
            <Label htmlFor="json-xml-delim">Delimiter</Label>
            <Select
              id="json-xml-delim"
              className="w-32"
              value={csvDelimiter}
              onValueChange={setCsvDelimiter}
              items={DELIMITERS}
            />
          </Inline>
        ) : null}
        <Inline gap="2">
          <Switch
            id="json-xml-sort"
            checked={sortKeys}
            onCheckedChange={setSortKeys}
          />
          <Label htmlFor="json-xml-sort">Sort keys</Label>
        </Inline>
        <SendToMenu
          size="sm"
          sourceTool={props.sourceTool}
          payload={() =>
            out.text
              ? {
                  kind: 'text',
                  mime: info.mime,
                  text: out.text,
                  sourceTool: props.sourceTool,
                  filename: `${props.fileBase}.${info.ext}`,
                }
              : null
          }
        />
      </Inline>
      {out.error ? (
        <Alert status="danger" className="p-3 text-sm">
          {out.error}
        </Alert>
      ) : null}
      <TextInputPanel
        className="min-h-0 flex-1"
        readOnly
        label={`${info.label} output`}
        language={info.language}
        value={out.text}
        onChange={() => {}}
        downloadName={`${props.fileBase}.${info.ext}`}
        maxHeight="none"
      />
    </Stack>
  );
}
