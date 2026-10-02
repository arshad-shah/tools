import React, { useEffect, useMemo, useState } from 'react';
import { IconDownload, IconRefreshCw } from '@/shared/ui/icons';
import {
  Button,
  Card,
  CardBody,
  ErrorState,
  Inline,
  Input,
  Kbd,
  Label,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInputPanel,
} from '@/shared/ui';
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

  return (
    <Stack gap="4">
      <Card>
        <CardBody>
          <Stack gap="4">
            <SegmentedControl<Family>
              label="Kind"
              value={family}
              onChange={(f) => update({ kind: f === 'uuid' ? 'v4' : f })}
              options={[
                { value: 'uuid', label: 'UUID' },
                { value: 'ulid', label: 'ULID' },
                { value: 'nanoid', label: 'NanoID' },
              ]}
            />
            <Inline gap="4" align="end" wrap>
              {family === 'uuid' && (
                <Stack gap="1">
                  <Label htmlFor="uuid-version">Version</Label>
                  <div className="w-60">
                    <Select
                      id="uuid-version"
                      value={s.kind}
                      onValueChange={(v) => update({ kind: v as IdKind })}
                      items={UUID_VERSIONS}
                    />
                  </div>
                </Stack>
              )}
              {family === 'nanoid' && (
                <>
                  <Stack gap="1">
                    <Label htmlFor="nano-alphabet">Alphabet</Label>
                    <div className="w-64">
                      <Select
                        id="nano-alphabet"
                        value={
                          NANOID_PRESETS.find(
                            (p) => p.alphabet === s.nanoAlphabet,
                          )?.alphabet ?? 'custom'
                        }
                        onValueChange={(v) =>
                          update({ nanoAlphabet: v === 'custom' ? 'abc' : v })
                        }
                        items={[
                          ...NANOID_PRESETS.map((p) => ({
                            value: p.alphabet,
                            label: p.label,
                          })),
                          { value: 'custom', label: 'Custom' },
                        ]}
                      />
                    </div>
                  </Stack>
                  <Stack gap="1">
                    <Label htmlFor="nano-custom">Characters</Label>
                    <Input
                      id="nano-custom"
                      value={s.nanoAlphabet}
                      onChange={(v) => update({ nanoAlphabet: v })}
                      spellCheck={false}
                    />
                  </Stack>
                  <Stack gap="1">
                    <Label htmlFor="nano-size">Length</Label>
                    <NumberInput
                      id="nano-size"
                      value={s.nanoSize}
                      onValueChange={(v) => update({ nanoSize: v })}
                      min={NANO_MIN}
                      max={NANO_MAX}
                    />
                  </Stack>
                </>
              )}
              {count > 1 ||
              s.kind === 'v4' ||
              s.kind === 'v7' ||
              family !== 'uuid' ? (
                <Stack gap="1">
                  <Label htmlFor="uuid-count">How many</Label>
                  <NumberInput
                    id="uuid-count"
                    value={s.count}
                    onValueChange={(v) => update({ count: clampCount(v) })}
                    min={1}
                    max={MAX_COUNT}
                  />
                </Stack>
              ) : null}
            </Inline>
            {s.kind === 'v5' && (
              <Inline gap="4" align="end" wrap>
                <Stack gap="1">
                  <Label htmlFor="v5-namespace">Namespace</Label>
                  <div className="w-44">
                    <Select
                      id="v5-namespace"
                      value={customNs ? 'custom' : s.v5Namespace}
                      onValueChange={(v) =>
                        update({ v5Namespace: v === 'custom' ? NIL : v })
                      }
                      items={NAMESPACE_ITEMS}
                    />
                  </div>
                </Stack>
                {customNs && (
                  <Stack gap="1">
                    <Label htmlFor="v5-custom">Namespace UUID</Label>
                    <Input
                      id="v5-custom"
                      value={s.v5Namespace}
                      onChange={(v) => update({ v5Namespace: v })}
                      spellCheck={false}
                    />
                  </Stack>
                )}
                <Stack gap="1" className="min-w-60 flex-1">
                  <Label htmlFor="v5-name">Name</Label>
                  <Input
                    id="v5-name"
                    value={name}
                    onChange={setName}
                    placeholder="www.example.com"
                    spellCheck={false}
                  />
                </Stack>
              </Inline>
            )}
            {family === 'uuid' && (
              <FormatSwitches
                format={s.format}
                onChange={(f) => update({ format: f })}
              />
            )}
            {family === 'nanoid' && (
              <Text size="sm" tone="subtle">
                {nanoidCollision(
                  new Set(s.nanoAlphabet).size,
                  s.nanoSize,
                  1000,
                )}
              </Text>
            )}
          </Stack>
        </CardBody>
      </Card>

      {error && <ErrorState title="Could not generate IDs" error={error} />}
      <Inline gap="2" align="center" wrap>
        <Button
          variant="primary"
          leftIcon={<IconRefreshCw size="sm" />}
          onClick={() => setNonce((n) => n + 1)}
        >
          Generate
        </Button>
        <Kbd keys="Mod+Enter" />
        {(['txt', 'csv', 'json'] as const).map((f) => (
          <Button
            key={f}
            variant="secondary"
            size="sm"
            leftIcon={<IconDownload size="sm" />}
            disabled={ids.length === 0}
            onClick={() => download(f)}
          >
            Download .{f}
          </Button>
        ))}
      </Inline>
      <div data-dynamic="">
        <TextInputPanel
          label="Generated IDs"
          value={text}
          onChange={() => {}}
          language="plain"
          readOnly
          minHeight={120}
          maxHeight={420}
          placeholder={s.kind === 'v5' ? 'Enter a name' : ''}
        />
      </div>
      <Card>
        <CardBody>
          <DecodePanel />
        </CardBody>
      </Card>
    </Stack>
  );
};

export default UuidGenerator;
