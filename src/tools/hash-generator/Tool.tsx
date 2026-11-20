import {
  Button,
  Checkbox,
  Inline,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  chevronDown,
  settings as settingsIcon,
} from '@arshad-shah/cynosure/icons';
import React, { useMemo, useState } from 'react';
import { DIGESTS, type DigestId } from '@/shared/lib/crypto/digest';
import { useHandoff } from '@/shared/lib/handoff';
import { FileHashes } from './components/FileHashes';
import { TextHash } from './components/TextHash';
import { DIGEST_FORMATS, type DigestFormat } from './lib/format';
import { hashSettings } from './settings';

const GROUPS: { id: string; label: string }[] = [
  { id: 'sha2', label: 'SHA-2' },
  { id: 'sha3', label: 'SHA-3' },
  { id: 'blake', label: 'BLAKE' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'checksum', label: 'Checksums' },
];

/**
 * Hash & Checksum (redesign spec, transform pattern): text or files in,
 * every chosen digest out, with an expected-hash check and HMAC.
 */
const HashGenerator: React.FC = () => {
  const [settings, update] = hashSettings.useSettings();
  const files = useHandoff();
  const [tab, setTab] = useState<'text' | 'files'>('text');
  const shownTab = tab;
  const [tookFiles, setTookFiles] = useState<unknown>(null);
  if (files && tookFiles !== files) {
    setTookFiles(files);
    setTab('files');
  }

  // Table order, so results and columns never depend on click order.
  const selected = useMemo(
    () =>
      DIGESTS.map((d) => d.id).filter((id) => settings.selected.includes(id)),
    [settings.selected],
  );
  const toggle = (id: DigestId, on: boolean) => {
    const next = on
      ? [...settings.selected, id]
      : settings.selected.filter((s) => s !== id);
    if (next.length) update({ selected: next });
  };

  const algorithms = (
    <Popover
      label="Algorithms"
      size="lg"
      trigger={(props) => (
        <Button
          {...props}
          variant="soft"
          icon={settingsIcon}
          iconEnd={chevronDown}
        >
          {`Algorithms (${selected.length})`}
        </Button>
      )}
    >
      <Stack gap="5" role="group" aria-label="Algorithms">
        {GROUPS.map((g) => (
          <Stack key={g.id} gap="2">
            <Text variant="eyebrow" tone="muted">
              {g.label}
            </Text>
            <Inline gap="4" wrap>
              {DIGESTS.filter((d) => d.group === g.id).map((d) => (
                <Checkbox
                  key={d.id}
                  label={d.name}
                  size="sm"
                  description={
                    d.broken
                      ? 'Broken for security'
                      : d.nonCrypto
                        ? 'Not cryptographic'
                        : undefined
                  }
                  checked={settings.selected.includes(d.id)}
                  onChange={(on) => toggle(d.id, on)}
                />
              ))}
            </Inline>
          </Stack>
        ))}
      </Stack>
    </Popover>
  );

  return (
    <Stack gap="6">
      <Inline gap="4" align="center" justify="between" wrap>
        <SegmentedControl
          label="Hash source"
          value={shownTab}
          onChange={(v) => setTab(v as 'text' | 'files')}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'files', label: 'Files' },
          ]}
        />
        <Inline gap="3" align="center" wrap>
          <Select
            label="Output format"
            labelHidden
            value={settings.output}
            onChange={(v) => update({ output: v as DigestFormat })}
            options={DIGEST_FORMATS}
          />
          {algorithms}
        </Inline>
      </Inline>
      {shownTab === 'text' ? (
        <TextHash
          selected={selected}
          output={settings.output}
          inputEncoding={settings.inputEncoding}
          onInputEncoding={(e) => update({ inputEncoding: e })}
          hmacAlg={settings.hmacAlg}
          onHmacAlg={(a) => update({ hmacAlg: a })}
        />
      ) : (
        <FileHashes
          selected={selected}
          output={settings.output}
          incoming={files}
        />
      )}
    </Stack>
  );
};

export default HashGenerator;
