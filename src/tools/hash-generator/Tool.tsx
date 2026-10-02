import React, { useCallback, useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  Checkbox,
  Inline,
  Label,
  PrivacyNote,
  SegmentedControl,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { DIGESTS, type DigestId } from '@/shared/lib/crypto/digest';
import { useHandoff } from '@/shared/lib/handoff';
import { DigestBadges } from './components/ResultRow';
import { FileHashes } from './components/FileHashes';
import { HmacCard } from './components/HmacCard';
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

const HashGenerator: React.FC = () => {
  const [settings, update] = hashSettings.useSettings();
  const files = useHandoff();
  const [tab, setTab] = useState<'text' | 'files'>('text');
  const [message, setMessage] = useState<Uint8Array | null>(null);
  const onMessage = useCallback((b: Uint8Array | null) => setMessage(b), []);
  const shownTab = files && tab === 'text' && !message ? 'files' : tab;

  // Table order, so results and grid columns never depend on click order.
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

  return (
    <Stack gap="4">
      <Card>
        <CardBody>
          <Stack gap="4">
            <Stack gap="2" role="group" aria-label="Algorithms">
              {GROUPS.map((g) => (
                <Inline key={g.id} gap="4" align="center" wrap>
                  <Text size="sm" weight="semibold" className="w-24">
                    {g.label}
                  </Text>
                  {DIGESTS.filter((d) => d.group === g.id).map((d) => (
                    <Inline key={d.id} gap="2" align="center">
                      <Checkbox
                        id={`alg-${d.id}`}
                        checked={settings.selected.includes(d.id)}
                        onCheckedChange={(on) => toggle(d.id, on)}
                        aria-label={d.name}
                        size="sm"
                      />
                      <Label htmlFor={`alg-${d.id}`}>{d.name}</Label>
                      <DigestBadges info={d} />
                    </Inline>
                  ))}
                </Inline>
              ))}
            </Stack>
            <SegmentedControl<DigestFormat>
              label="Output format"
              value={settings.output}
              onChange={(v) => update({ output: v })}
              options={DIGEST_FORMATS}
              size="sm"
            />
          </Stack>
        </CardBody>
      </Card>

      <Tabs
        value={shownTab}
        onValueChange={(v) => setTab(v as 'text' | 'files')}
        variant="soft"
      >
        <TabsList aria-label="Hash source">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        <TabsContent value="text">
          <Stack gap="4" className="pt-4">
            <TextHash
              selected={selected}
              output={settings.output}
              inputEncoding={settings.inputEncoding}
              onInputEncoding={(e) => update({ inputEncoding: e })}
              onMessage={onMessage}
            />
            <HmacCard
              message={message}
              alg={settings.hmacAlg}
              onAlg={(a) => update({ hmacAlg: a })}
              output={settings.output}
            />
          </Stack>
        </TabsContent>
        <TabsContent value="files">
          <div className="pt-4">
            <FileHashes
              selected={selected}
              output={settings.output}
              incoming={files}
            />
          </div>
        </TabsContent>
      </Tabs>
      <PrivacyNote variant="local" />
    </Stack>
  );
};

export default HashGenerator;
