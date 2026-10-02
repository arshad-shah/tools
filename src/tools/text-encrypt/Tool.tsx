import React, { useEffect, useState } from 'react';
import {
  Card,
  CardBody,
  PrivacyNote,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import {
  generatePassphrase,
  loadEffWordlist,
} from '@/tools/password-generator/lib/passphrase';
import { FileMode } from './components/FileMode';
import { KdfOptions } from './components/KdfOptions';
import { TextMode } from './components/TextMode';
import { useCryptoJob } from './hooks/useCryptoJob';
import { encryptSettings } from './settings';

const isSecret = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'application/vnd.tools.secret';

const TextEncrypt: React.FC = () => {
  const [settings, update] = encryptSettings.useSettings();
  const jobs = useCryptoJob();
  const [tab, setTab] = useState<'text' | 'file'>('text');
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
    passphrase,
    onPassphrase: setPassphrase,
    onGenerate: generate,
  };

  return (
    <Stack gap="4">
      <Card>
        <CardBody>
          <KdfOptions
            value={settings.kdf}
            onChange={(kdf) => update({ kdf })}
          />
        </CardBody>
      </Card>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'text' | 'file')}
        variant="soft"
      >
        <TabsList aria-label="Mode">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="file">File</TabsTrigger>
        </TabsList>
        <TabsContent value="text">
          <div className="pt-4">
            <TextMode {...shared} />
          </div>
        </TabsContent>
        <TabsContent value="file">
          <div className="pt-4">
            <FileMode {...shared} file={file} onFile={setFile} />
          </div>
        </TabsContent>
      </Tabs>
      <PrivacyNote variant="local">
        AES-256-GCM in your browser; passphrases are never stored.
      </PrivacyNote>
    </Stack>
  );
};

export default TextEncrypt;
