import {
  Button,
  CopyButton,
  Inline,
  Menu,
  Notice,
  Select,
  Stack,
  Switch,
  TextField,
} from '@arshad-shah/cynosure';
import { download, send } from '@arshad-shah/cynosure/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toolsAccepting } from '@/app/registry';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';

import { convert, escapeJsonString, unescapeJsonString } from '../lib/convert';
import { inferJsonSchema, inferTypeScript } from '../lib/infer';
import { TARGETS, type ConvertTabTarget } from '../lib/targets';
import { viewerSettings } from '../settings';
import { CodeEditor } from '@/shared/editor';

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
  const navigate = useNavigate();
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
  const fileName = `${props.fileBase}.${info.ext}`;
  const targets = toolsAccepting(info.mime).filter(
    (t) => t.id !== props.sourceTool,
  );
  return (
    <Stack gap="3" fill minSize="0">
      <Inline gap="3" align="end" wrap>
        <Select
          label="Convert to"
          size="sm"
          value={target}
          onChange={(v) => setTarget(v as ConvertTabTarget)}
          options={(Object.keys(TARGETS) as ConvertTabTarget[]).map((t) => ({
            value: t,
            label: TARGETS[t].label,
          }))}
        />
        <Select
          label="Indent"
          size="sm"
          value={indent === 'tab' ? 'tab' : String(indent)}
          onChange={(v) => update({ indent: v === 'tab' ? 0 : Number(v) })}
          options={INDENTS}
        />
        {target === 'xml' && !xml ? (
          <TextField
            label="Root name"
            size="sm"
            value={rootName}
            onChange={setRootName}
          />
        ) : null}
        {target === 'csv' ? (
          <Select
            label="Delimiter"
            size="sm"
            value={csvDelimiter}
            onChange={setCsvDelimiter}
            options={DELIMITERS}
          />
        ) : null}
        <Switch
          size="sm"
          label="Sort keys"
          checked={sortKeys}
          onChange={setSortKeys}
        />
      </Inline>
      {out.error ? <Notice tone="danger">{out.error}</Notice> : null}
      <Inline gap="1" align="center" justify="end">
        <CopyButton
          size="sm"
          variant="ghost"
          disabled={!out.text}
          value={() => out.text}
          labels={{ copy: `Copy ${info.label}`, copied: 'Copied' }}
        />
        <Button
          size="sm"
          variant="ghost"
          icon={download}
          disabled={!out.text}
          onClick={() =>
            saveBlob(new Blob([out.text], { type: info.mime }), fileName)
          }
        >
          {`Download ${info.label}`}
        </Button>
        {targets.length ? (
          <Menu
            label={`Send ${info.label} to`}
            items={targets.map((t) => ({ value: t.id, label: t.name }))}
            onSelect={(id) =>
              sendTo(navigate, id, {
                kind: 'text',
                mime: info.mime,
                text: out.text,
                sourceTool: props.sourceTool,
                filename: fileName,
              })
            }
            trigger={(p) => (
              <Button
                {...p}
                size="sm"
                variant="ghost"
                icon={send}
                disabled={!out.text}
              >
                Send to
              </Button>
            )}
          />
        ) : null}
      </Inline>
      <Stack grow minSize="0">
        <CodeEditor
          readOnly
          aria-label={`${info.label} output`}
          language={info.language}
          value={out.text}
          minHeight="100%"
          maxHeight="100%"
        />
      </Stack>
    </Stack>
  );
}
