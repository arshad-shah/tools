import {
  Card,
  Disclosure,
  Inline,
  SegmentedControl,
  Stack,
} from '@arshad-shah/cynosure';
import React, { useState } from 'react';
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
        <Stack gap="6">
          <Card
            as="section"
            title={`Your ${settings.mode === 'pin' ? 'PIN' : settings.mode}`}
          >
            {result}
          </Card>
        </Stack>
      }
      end={
        <Stack gap="6">
          <Card as="section" title="Options">
            {options}
          </Card>
          <Card as="section">
            <Disclosure summary="Generate many" variant="plain">
              <BulkPanel
                count={settings.bulkCount}
                onCount={(n) => update({ bulkCount: n })}
                make={make}
              />
            </Disclosure>
          </Card>
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
    </Stack>
  );
};

export default PasswordGenerator;
