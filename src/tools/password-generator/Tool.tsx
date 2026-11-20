import {
  Card,
  Disclosure,
  Inline,
  SegmentedControl,
  Stack,
} from '@arshad-shah/cynosure';
import React, { useState } from 'react';
import {
  ProductionUseNotice,
  type LocalCommand,
} from '@/app/ui/production-use';
import { TransformLayout } from '@/app/ui/transform';
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

/** 32 random bytes, as most secret managers and frameworks expect. */
const SERVICE_SECRET_COMMANDS: readonly LocalCommand[] = [
  { label: 'Random secret (Base64)', command: 'openssl rand -base64 32' },
  { label: 'Random secret (hex)', command: 'openssl rand -hex 32' },
];

type Tab = PasswordSettings['mode'] | 'check';

/**
 * Password Generator (redesign spec, transform pattern): the options beside
 * the generated secret and its strength; a checker for existing ones.
 */
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

  const place = ({
    result,
    options,
  }: {
    result: React.ReactNode;
    options: React.ReactNode;
  }) => (
    <TransformLayout
      defaultSize={55}
      start={
        <Card
          as="section"
          title={`Your ${settings.mode === 'pin' ? 'PIN' : settings.mode}`}
        >
          {result}
        </Card>
      }
      end={
        <Stack gap="6">
          <Card as="section" title="Options">
            {options}
          </Card>
          <Disclosure summary="Generate many" variant="card">
            <BulkPanel
              count={settings.bulkCount}
              onCount={(n) => update({ bulkCount: n })}
              make={make}
            />
          </Disclosure>
        </Stack>
      }
    />
  );

  const generator =
    settings.mode === 'passphrase' ? (
      <PassphraseTab
        settings={settings}
        update={update}
        nonce={nonce}
        onRegenerate={regenerate}
      >
        {place}
      </PassphraseTab>
    ) : (
      <GeneratorTab
        settings={settings}
        update={update}
        pin={settings.mode === 'pin'}
        nonce={nonce}
        onRegenerate={regenerate}
      >
        {place}
      </GeneratorTab>
    );

  return (
    <Stack gap="6">
      <Inline>
        <SegmentedControl
          label="Generator"
          value={tab}
          onChange={(v) => {
            if (v === 'check') setChecking(true);
            else {
              setChecking(false);
              update({ mode: v as PasswordSettings['mode'] });
            }
          }}
          options={[
            { value: 'password', label: 'Password' },
            { value: 'passphrase', label: 'Passphrase' },
            { value: 'pin', label: 'PIN' },
            { value: 'check', label: 'Check strength' },
          ]}
        />
      </Inline>
      {tab === 'check' ? <CheckerTab /> : generator}
      {tab === 'check' ? null : (
        <ProductionUseNotice
          title="For real accounts and services"
          commandsLabel="Make a service secret on your own machine"
          commands={SERVICE_SECRET_COMMANDS}
        >
          Made with your browser's secure random generator and never stored. For
          a real account, let your password manager generate and save it, so it
          is never pasted around. For production service secrets (database
          passwords, API keys) use your secret manager, or make them locally
          with the commands below.
        </ProductionUseNotice>
      )}
    </Stack>
  );
};

export default PasswordGenerator;
