import {
  Button,
  Card,
  CodeBlock,
  CopyButton,
  EmptyState,
  Grid,
  Inline,
  Kbd,
  Menu,
  Notice,
  NumberField,
  SegmentedControl,
  Select,
  Stack,
  TextField,
  Tooltip,
} from '@arshad-shah/cynosure';
import {
  download as downloadIcon,
  refreshCw,
  tag,
} from '@arshad-shah/cynosure/icons';
import React, { useEffect, useMemo, useState } from 'react';
import { TransformLayout } from '@/app/ui/transform';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { DecodePanel } from './components/DecodePanel';
import { FormatSwitches } from './components/FormatSwitches';
import {
  clampCount,
  EXPORT_MIME,
  exportIds,
  MAX_COUNT,
  type ExportFormat,
} from './lib/export';
import {
  NANO_MAX,
  NANO_MIN,
  NANOID_PRESETS,
  nanoid,
  nanoidCollision,
} from './lib/nanoid';
import { createUlid } from './lib/ulid';
import {
  createUuidV7,
  formatUuid,
  MAX,
  NAMESPACES,
  NIL,
  uuidV4,
  uuidV5,
} from './lib/uuid';
import { uuidSettings, type IdKind } from './settings';

type Family = 'uuid' | 'ulid' | 'nanoid';
const familyOf = (k: IdKind): Family =>
  k === 'ulid' ? 'ulid' : k === 'nanoid' ? 'nanoid' : 'uuid';

const UUID_VERSIONS = [
  { value: 'v4', label: 'Version 4 (random)' },
  { value: 'v7', label: 'Version 7 (time-ordered)' },
  { value: 'v5', label: 'Version 5 (name, SHA-1)' },
  { value: 'nil', label: 'Nil' },
  { value: 'max', label: 'Max' },
];
const NAMESPACE_ITEMS = [
  ...Object.keys(NAMESPACES).map((k) => ({
    value: k,
    label: k.toUpperCase(),
  })),
  { value: 'custom', label: 'Custom UUID' },
];

/**
 * UUID / ULID / NanoID Generator (redesign spec, transform pattern): the
 * kind and its options beside the generated ids and a decoder.
 */
const UuidGenerator: React.FC = () => {
  const [s, update] = uuidSettings.useSettings();
  const family = familyOf(s.kind);
  const [nonce, setNonce] = useState(0);
  const [name, setName] = useState('');
  const [v5Result, setV5Result] = useState<{
    key: string;
    ids: string[];
    error?: ToolError;
  }>();
  // One generator per page, so v7 and ULID stay monotonic across runs.
  const [makers] = useState(() => ({ v7: createUuidV7(), ulid: createUlid() }));
  const customNs = !(s.v5Namespace in NAMESPACES);
  const count =
    s.kind === 'v5' || s.kind === 'nil' || s.kind === 'max' ? 1 : s.count;

  const sync = useMemo((): { ids: string[]; error?: ToolError } => {
    void nonce;
    try {
      const fmt = (u: string) => formatUuid(u, s.format);
      const one = (): string => {
        switch (s.kind) {
          case 'v4':
            return fmt(uuidV4());
          case 'v7':
            return fmt(makers.v7());
          case 'nil':
            return fmt(NIL);
          case 'max':
            return fmt(MAX);
          case 'ulid':
            return makers.ulid();
          default:
            return nanoid(s.nanoAlphabet, s.nanoSize);
        }
      };
      if (s.kind === 'v5') return { ids: [] };
      return { ids: Array.from({ length: count }, one) };
    } catch (e) {
      return { ids: [], error: toToolError(e) };
    }
  }, [s, count, nonce, makers]);

  const v5Key = JSON.stringify([s.v5Namespace, name, s.format]);
  useEffect(() => {
    if (s.kind !== 'v5' || !name) return;
    let live = true;
    uuidV5(s.v5Namespace, name).then(
      (u) =>
        live && setV5Result({ key: v5Key, ids: [formatUuid(u, s.format)] }),
      (e) =>
        live && setV5Result({ key: v5Key, ids: [], error: toToolError(e) }),
    );
    return () => {
      live = false;
    };
  }, [s.kind, s.v5Namespace, s.format, name, v5Key]);

  const v5 = v5Result && v5Result.key === v5Key ? v5Result : undefined;
  const ids = s.kind === 'v5' ? (name ? (v5?.ids ?? []) : []) : sync.ids;
  const error = s.kind === 'v5' ? v5?.error : sync.error;
  const text = ids.join('\n');

  const download = (format: ExportFormat) =>
    saveBlob(
      new TextEncoder().encode(exportIds(ids, format)),
      deriveFilename('ids', '', format),
      EXPORT_MIME[format],
    );

  useToolCommands('uuid-generator', [
    {
      id: 'generate',
      label: 'Generate new IDs',
      shortcut: 'Mod+Enter',
      run: () => setNonce((n) => n + 1),
    },
  ]);

  const generate = () => setNonce((n) => n + 1);
  const showCount = s.kind === 'v4' || s.kind === 'v7' || family !== 'uuid';

  const options = (
    <Card as="section" title="Options">
      <Stack gap="5">
        <SegmentedControl
          label="Kind"
          fullWidth
          value={family}
          onChange={(f) =>
            update({ kind: f === 'uuid' ? 'v4' : (f as IdKind) })
          }
          options={[
            { value: 'uuid', label: 'UUID' },
            { value: 'ulid', label: 'ULID' },
            { value: 'nanoid', label: 'NanoID' },
          ]}
        />
        <Grid minItemWidth="13rem" gap="4">
          {family === 'uuid' ? (
            <Select
              label="Version"
              value={s.kind}
              onChange={(v) => update({ kind: v as IdKind })}
              options={UUID_VERSIONS}
            />
          ) : null}
          {family === 'nanoid' ? (
            <>
              <Select
                label="Alphabet"
                value={
                  NANOID_PRESETS.find((p) => p.alphabet === s.nanoAlphabet)
                    ?.alphabet ?? 'custom'
                }
                onChange={(v) =>
                  update({ nanoAlphabet: v === 'custom' ? 'abc' : v })
                }
                options={[
                  ...NANOID_PRESETS.map((p) => ({
                    value: p.alphabet,
                    label: p.label,
                  })),
                  { value: 'custom', label: 'Custom' },
                ]}
              />
              <NumberField
                label="Length"
                value={s.nanoSize}
                min={NANO_MIN}
                max={NANO_MAX}
                onChange={(v) => v !== null && update({ nanoSize: v })}
              />
            </>
          ) : null}
          {showCount ? (
            <NumberField
              label="How many"
              value={s.count}
              min={1}
              max={MAX_COUNT}
              onChange={(v) => v !== null && update({ count: clampCount(v) })}
            />
          ) : null}
        </Grid>
        {family === 'nanoid' ? (
          <TextField
            label="Characters"
            value={s.nanoAlphabet}
            onChange={(v) => update({ nanoAlphabet: v })}
            spellCheck={false}
            description={nanoidCollision(
              new Set(s.nanoAlphabet).size,
              s.nanoSize,
              1000,
            )}
          />
        ) : null}
        {s.kind === 'v5' ? (
          <Grid minItemWidth="13rem" gap="4">
            <Select
              label="Namespace"
              value={customNs ? 'custom' : s.v5Namespace}
              onChange={(v) =>
                update({ v5Namespace: v === 'custom' ? NIL : v })
              }
              options={NAMESPACE_ITEMS}
            />
            {customNs ? (
              <TextField
                label="Namespace UUID"
                monospace
                value={s.v5Namespace}
                onChange={(v) => update({ v5Namespace: v })}
                spellCheck={false}
              />
            ) : null}
            <TextField
              label="Name"
              value={name}
              onChange={setName}
              placeholder="www.example.com"
              spellCheck={false}
            />
          </Grid>
        ) : null}
        {family === 'uuid' ? (
          <FormatSwitches
            format={s.format}
            onChange={(f) => update({ format: f })}
          />
        ) : null}
        <Inline>
          <Tooltip
            content={
              <Inline gap="2" align="center" as="span">
                Generate new IDs
                <Kbd keys="mod+enter" size="sm" />
              </Inline>
            }
          >
            <Button
              variant="solid"
              tone="accent"
              icon={refreshCw}
              aria-keyshortcuts="Control+Enter"
              onClick={generate}
            >
              Generate
            </Button>
          </Tooltip>
        </Inline>
      </Stack>
    </Card>
  );

  const results = (
    <Stack gap="6">
      <Card as="section" title="Generated IDs">
        <Stack gap="4">
          {error ? (
            <Notice tone="danger" title="Could not generate IDs">
              {error.message}
            </Notice>
          ) : null}
          {ids.length ? (
            <CodeBlock
              title={`${ids.length} ${ids.length === 1 ? 'ID' : 'IDs'}`}
              code={text}
              lineNumbers={ids.length > 1}
              copyable={false}
              actions={
                <Inline gap="1">
                  <CopyButton
                    size="sm"
                    value={text}
                    labels={{ copy: 'Copy all' }}
                  />
                  <Menu
                    label="Download"
                    items={(['txt', 'csv', 'json'] as const).map((f) => ({
                      value: f,
                      label: `Download .${f}`,
                    }))}
                    onSelect={(f) => download(f as ExportFormat)}
                    trigger={(props) => (
                      <Button
                        {...props}
                        size="sm"
                        variant="ghost"
                        icon={downloadIcon}
                      >
                        Download
                      </Button>
                    )}
                  />
                </Inline>
              }
            />
          ) : !error ? (
            <EmptyState
              icon={tag}
              title="Enter a name"
              description="Version 5 ids are the same for the same namespace and name."
            />
          ) : null}
        </Stack>
      </Card>
      <DecodePanel />
    </Stack>
  );

  return <TransformLayout start={options} end={results} defaultSize={42} />;
};

export default UuidGenerator;
