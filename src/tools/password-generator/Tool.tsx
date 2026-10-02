import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardBody,
  PrivacyNote,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { BulkPanel } from './components/BulkPanel';
import { CheckerTab } from './components/CheckerTab';
import { GeneratorTab } from './components/GeneratorTab';
import { PassphraseTab } from './components/PassphraseTab';
import { useWordlist } from './hooks/useWordlist';
import { optionsFrom } from './lib/options';
import { generatePassword } from './lib/generate';
import { generatePassphrase } from './lib/passphrase';
import { passwordSettings, type PasswordSettings } from './settings';

type Tab = PasswordSettings['mode'] | 'check';

const PasswordGenerator: React.FC = () => {
  const [settings, update] = passwordSettings.useSettings();
  const [checking, setChecking] = useState(false);
  const tab: Tab = checking ? 'check' : settings.mode;
  const [nonce, setNonce] = useState(0);
  const regenerate = () => setNonce((n) => n + 1);
  const list = useWordlist();

  useToolCommands('password-generator', [
    {
      id: 'regenerate',
      label: 'Generate a new one',
      shortcut: 'Mod+Enter',
      enabled: tab !== 'check',
      run: regenerate,
    },
  ]);

  const make = () =>
    settings.mode === 'passphrase'
      ? generatePassphrase(
          {
            words: settings.words,
            separator: settings.separator,
            capitalise: settings.capitalise,
            addNumber: settings.addNumber,
            addSymbol: settings.addSymbol,
          },
          list ?? [],
        )
      : generatePassword(optionsFrom(settings, settings.mode === 'pin'));

  const generator = (
    <Stack gap="4" className="pt-4">
      <Card>
        <CardBody>
          {settings.mode === 'passphrase' ? (
            <PassphraseTab
              settings={settings}
              update={update}
              nonce={nonce}
              onRegenerate={regenerate}
            />
          ) : (
            <GeneratorTab
              settings={settings}
              update={update}
              pin={settings.mode === 'pin'}
              nonce={nonce}
              onRegenerate={regenerate}
            />
          )}
        </CardBody>
      </Card>
      <Accordion type="single">
        <AccordionItem value="bulk">
          <AccordionTrigger>Generate many</AccordionTrigger>
          <AccordionContent>
            <BulkPanel
              count={settings.bulkCount}
              onCount={(n) => update({ bulkCount: n })}
              make={make}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Stack>
  );

  return (
    <Stack gap="4">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          if (v === 'check') setChecking(true);
          else {
            setChecking(false);
            update({ mode: v as PasswordSettings['mode'] });
          }
        }}
        variant="soft"
      >
        <TabsList aria-label="Generator">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="passphrase">Passphrase</TabsTrigger>
          <TabsTrigger value="pin">PIN</TabsTrigger>
          <TabsTrigger value="check">Check strength</TabsTrigger>
        </TabsList>
        <TabsContent value="password">{generator}</TabsContent>
        <TabsContent value="passphrase">{generator}</TabsContent>
        <TabsContent value="pin">{generator}</TabsContent>
        <TabsContent value="check">
          <div className="pt-4">
            <CheckerTab />
          </div>
        </TabsContent>
      </Tabs>
      {tab !== 'check' && (
        <PrivacyNote variant="local">
          Generated with your browser's secure random source; never stored.
        </PrivacyNote>
      )}
    </Stack>
  );
};

export default PasswordGenerator;
