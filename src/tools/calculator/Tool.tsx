import React, { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardBody,
  Container,
  IconButton,
  Inline,
  SegmentedControl,
  ShareButton,
  Stack,
} from '@/shared/ui';
import { IconInfo } from '@/shared/ui/icons';
import { copyText } from '@/shared/lib/clipboard';
import { notify } from '@/shared/lib/notify';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { Grapher } from './components/Grapher';
import { HelpSheet } from './components/HelpSheet';
import { HistoryPanel } from './components/HistoryPanel';
import { Keypad, type KeyEffect } from './components/Keypad';
import { MemoryPanel } from './components/MemoryPanel';
import { Programmer } from './components/Programmer';
import { Sheet } from './components/Sheet';
import { SheetSettings } from './components/SheetSettings';
import { useSheet } from './hooks/useSheet';
import { useSheetKeys } from './hooks/useSheetKeys';
import type { LineResult } from './lib/engine';
import { calculatorSettings, type CalculatorMode } from './settings';
import {
  CALCULATOR_SHARE_VERSION,
  parseCalculatorShare,
  type CalculatorShare,
} from './share';

const MODES: { value: CalculatorMode; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'scientific', label: 'Scientific' },
  { value: 'programmer', label: 'Programmer' },
  { value: 'grapher', label: 'Grapher' },
];

/** A line result as a plain number, for the memory registers. */
function numberOf(result: LineResult | undefined): number | null {
  if (!result?.ok || !('value' in result)) return null;
  const v = result.value;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v && typeof (v as { toNumber?: unknown }).toNumber === 'function') {
    const n = (v as { toNumber(): number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Calculator & Grapher (spec §8.5, D12): an expression sheet with live
 * per-line results, Standard and Scientific keypads that insert tokens,
 * a programmer mode, a multi-function grapher, history, favourites,
 * memories and share links.
 */
const Calculator: React.FC = () => {
  const [settings, update] = calculatorSettings.useSettings();
  const [helpOpen, setHelpOpen] = useState(false);
  const sheet = useSheet({
    angle: settings.angle,
    precision: settings.precision,
    bigNumber: settings.bigNumber,
    notation: { thousands: settings.thousands, sciAbove: settings.sciAbove },
  });
  const { mode } = settings;
  const sheetMode = mode === 'standard' || mode === 'scientific';

  const shareState = useShareableState<CalculatorShare>({
    toolId: 'calculator',
    version: CALCULATOR_SHARE_VERSION,
    parse: (state) => parseCalculatorShare(state),
    select: () => ({
      lines: sheet.lines,
      angle: settings.angle,
      precision: settings.precision,
    }),
  });
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && shareState.loaded) {
    setHydrated(true);
    sheet.setLines(shareState.loaded.lines);
  }
  const loaded = shareState.loaded;
  const applied = useRef(false);
  useEffect(() => {
    if (!loaded || applied.current) return;
    applied.current = true;
    update({
      angle: loaded.angle,
      precision: loaded.precision,
      ...(mode === 'programmer' || mode === 'grapher'
        ? { mode: 'standard' as const }
        : {}),
    });
  }, [loaded, update, mode]);

  useSheetKeys(sheet, sheetMode && !helpOpen);

  const active = sheet.results[sheet.activeLine];
  const activeText = active?.ok ? active.text : '';
  const copyResult = async () => {
    if (!activeText) return;
    try {
      await copyText(activeText);
      notify.success('Result copied');
    } catch {
      notify.error('Could not copy to clipboard');
    }
  };

  useToolCommands('calculator', [
    {
      id: 'copy-result',
      label: 'Copy result',
      shortcut: 'Mod+Shift+C',
      enabled: sheetMode && activeText !== '',
      run: () => void copyResult(),
    },
    {
      id: 'clear',
      label: 'Clear the sheet',
      enabled: sheetMode,
      run: () => sheet.clearAll(),
    },
    {
      id: 'help',
      label: 'Calculator keys',
      shortcut: '?',
      group: 'Help',
      run: () => setHelpOpen(true),
    },
  ]);

  const onKey = (effect: KeyEffect) => {
    if ('insert' in effect) sheet.insert(effect.insert);
    else if (effect.command === 'evaluate') sheet.evaluateActive();
    else if (effect.command === 'clear') sheet.clearActive();
    else sheet.backspace();
  };

  return (
    <Container size="lg">
      <Stack gap="4">
        <Inline justify="between" align="center" gap="2" wrap>
          <SegmentedControl
            label="Calculator mode"
            value={mode}
            onChange={(m) => update({ mode: m })}
            options={MODES}
          />
          <Inline gap="2">
            <ShareButton share={shareState} />
            <IconButton
              variant="secondary"
              size="sm"
              label="Calculator keys"
              showLabel="desktop"
              icon={IconInfo}
              onClick={() => setHelpOpen(true)}
            />
          </Inline>
        </Inline>

        {sheetMode && (
          <>
            <Card>
              <CardBody>
                <Stack gap="4">
                  <SheetSettings settings={settings} onChange={update} />
                  <Sheet sheet={sheet} />
                </Stack>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Keypad scientific={mode === 'scientific'} onKey={onKey} />
              </CardBody>
            </Card>
            <HistoryPanel
              history={settings.history}
              saved={settings.saved}
              onHistoryChange={(history) => update({ history })}
              onSavedChange={(saved) => update({ saved })}
              onUse={(text) => sheet.insert(text)}
              memory={
                <MemoryPanel
                  memories={settings.memories}
                  onChange={(memories) => update({ memories })}
                  current={numberOf(active)}
                  onRecall={(text) => sheet.insert(text)}
                />
              }
            />
          </>
        )}

        {mode === 'programmer' && (
          <Card>
            <CardBody>
              <Programmer
                wordBits={settings.wordBits}
                signed={settings.signed}
                onWordChange={update}
              />
            </CardBody>
          </Card>
        )}

        {mode === 'grapher' && (
          <Card>
            <CardBody>
              <Stack gap="4">
                <SegmentedControl
                  label="Angle unit"
                  size="sm"
                  value={settings.angle}
                  onChange={(angle) => update({ angle })}
                  options={[
                    { value: 'deg', label: 'Degrees' },
                    { value: 'rad', label: 'Radians' },
                  ]}
                />
                <Grapher angle={settings.angle} />
              </Stack>
            </CardBody>
          </Card>
        )}
      </Stack>
      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </Container>
  );
};

export default Calculator;
