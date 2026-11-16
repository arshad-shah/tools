import { Inline, SegmentedControl, Stack } from '@arshad-shah/cynosure';
import React, { useEffect, useState } from 'react';
import { useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import {
  generatePassphrase,
  loadEffWordlist,
} from '@/tools/password-generator/lib/passphrase';
import { FileMode } from './components/FileMode';
import { TextMode, type Direction } from './components/TextMode';
import { useCryptoJob } from './hooks/useCryptoJob';
import { encryptSettings } from './settings';

const isSecret = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'application/vnd.tools.secret';

/**
 * Encrypt Text and Files (redesign spec, transform pattern): AES-256-GCM in
 * the browser. Passphrases live in memory only.
 */
const TextEncrypt: React.FC = () => {
  const [settings, update] = encryptSettings.useSettings();
  const jobs = useCryptoJob();
  const [tab, setTab] = useState<'text' | 'file'>('text');
  const [direction, setDirection] = useState<Direction>('encrypt');
  // Passphrases live in memory only (spec §9.5).
  const [passphrase, setPassphrase] = useState('');
  const secret = useHandoff(isSecret);
  const files = useHandoff();
  const [file, setFile] = useState<File | null>(null);
  const [took, setTook] = useState<{ secret: unknown; files: unknown }>({
    secret: null,
    files: null,
  });
  if (secret && took.secret !== secret && secret.kind === 'text') {
    setTook((t) => ({ ...t, secret }));
    setPassphrase(secret.text);
  }
  if (files && took.files !== files) {
    setTook((t) => ({ ...t, files }));
    setFile(files[0]);
    setTab('file');
  }

  const [words, setWords] = useState<readonly string[] | null>(null);
  useEffect(() => {
    void loadEffWordlist().then(setWords);
  }, []);
  const generate = () => {
    if (!words) return;
    setPassphrase(
      generatePassphrase(
        {
          words: 6,
          separator: '-',
          capitalise: 'none',
          addNumber: false,
          addSymbol: false,
        },
        words,
      ),
    );
  };

  const shared = {
    jobs,
    kdf: settings.kdf,
    onKdf: (kdf: typeof settings.kdf) => update({ kdf }),
    passphrase,
    onPassphrase: setPassphrase,
    onGenerate: generate,
  };

  return (
    <Stack gap="6">
      <Inline gap="4" wrap>
        <SegmentedControl
          label="Mode"
          value={tab}
          onChange={(v) => setTab(v as 'text' | 'file')}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'file', label: 'File' },
          ]}
        />
        {tab === 'text' ? (
          <SegmentedControl
            label="Direction"
            value={direction}
            onChange={(d) => {
              setDirection(d as Direction);
              jobs.sealJob.reset();
              jobs.openJob.reset();
            }}
            options={[
              { value: 'encrypt', label: 'Encrypt' },
              { value: 'decrypt', label: 'Decrypt' },
            ]}
          />
        ) : null}
      </Inline>
      {tab === 'text' ? (
        <TextMode {...shared} direction={direction} />
      ) : (
        <FileMode {...shared} file={file} onFile={setFile} />
      )}
    </Stack>
  );
};

export default TextEncrypt;
