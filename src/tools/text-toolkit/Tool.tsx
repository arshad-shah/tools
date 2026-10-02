import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ToolProps } from '@/app/tool';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useToolCommands, type ToolCommand } from '@/shared/lib/tool-commands';
import {
  Grid,
  IconButton,
  Inline,
  SendToMenu,
  Stack,
  TextInputPanel,
  Tooltip,
} from '@/shared/ui';
import { IconRedo, IconUndo } from '@/shared/ui/icons';
import { createRegexRunner } from '@/tools/regex-tester/lib/runner';
import { OpsPanel } from './components/OpsPanel';
import { ReplacePanel } from './components/ReplacePanel';
import { StatsPanel } from './components/StatsPanel';
import { useUndoableText } from './hooks/useUndoableText';
import type { FindOptions } from './lib/find';
import { buildOps, type TextOp } from './lib/ops';
import { toolkitSettings } from './settings';

const SAMPLES = [
  {
    label: 'Short article',
    value:
      'The quick brown fox jumps over the lazy dog. The dog sleeps.\n\nBananas\napples\ncherries\napples\n  Dates  \n',
  },
];

const acceptsText = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'text/plain';

const UNDO_SHORTCUT = 'Mod+Z';
const REDO_SHORTCUT = 'Mod+Shift+Z';

/** Text Toolkit (spec §9.1): statistics, case, lines, clean-up and replace. */
export default function TextToolkit({ definition }: ToolProps) {
  const doc = useUndoableText('');
  const { text, apply, undo, redo, canUndo, canRedo } = doc;
  const [settings, update] = toolkitSettings.useSettings();
  const [filter, setFilter] = useState('');
  const [runner] = useState(() => createRegexRunner());
  useEffect(() => () => runner.dispose(), [runner]);

  const ops = useMemo(() => buildOps(settings, { filter }), [settings, filter]);

  const runOp = useCallback(
    (op: TextOp) => {
      apply(op.run, op.label);
      if (op.remember) update(op.remember);
    },
    [apply, update],
  );

  const onUndo = useCallback(() => {
    if (doc.undoLabel) notify.info(`Undid ${doc.undoLabel}`);
    undo();
  }, [doc.undoLabel, undo]);

  const commands: ToolCommand[] = [
    ...ops.map((op) => ({
      id: op.id,
      label: op.label,
      group: op.group,
      run: () => runOp(op),
    })),
    {
      id: 'undo',
      label: 'Undo',
      group: 'Edit',
      shortcut: UNDO_SHORTCUT,
      enabled: canUndo,
      run: onUndo,
    },
    {
      id: 'redo',
      label: 'Redo',
      group: 'Edit',
      shortcut: REDO_SHORTCUT,
      enabled: canRedo,
      run: redo,
    },
  ];
  useToolCommands(definition.id, commands);

  const findOptions: FindOptions = {
    regex: settings.findRegex,
    caseSensitive: settings.findCaseSensitive,
    wholeWord: settings.findWholeWord,
  };
  const onFindOptions = (patch: Partial<FindOptions>) =>
    update({
      ...(patch.regex !== undefined && { findRegex: patch.regex }),
      ...(patch.caseSensitive !== undefined && {
        findCaseSensitive: patch.caseSensitive,
      }),
      ...(patch.wholeWord !== undefined && { findWholeWord: patch.wholeWord }),
    });

  const onReplace = (from: string, output: string, count: number) => {
    apply((current) => (current === from ? output : current), 'Replace all');
    notify.info(
      count === 0
        ? 'Nothing to replace'
        : `Replaced ${count} ${count === 1 ? 'match' : 'matches'}`,
    );
  };

  return (
    <Stack gap="6">
      <Inline gap="2" wrap justify="end">
        <Tooltip content="Undo" shortcut={UNDO_SHORTCUT}>
          <IconButton
            label="Undo"
            icon={IconUndo}
            size="sm"
            variant="ghost"
            disabled={!canUndo}
            onClick={onUndo}
          />
        </Tooltip>
        <Tooltip content="Redo" shortcut={REDO_SHORTCUT}>
          <IconButton
            label="Redo"
            icon={IconRedo}
            size="sm"
            variant="ghost"
            disabled={!canRedo}
            onClick={redo}
          />
        </Tooltip>
        <SendToMenu
          sourceTool={definition.id}
          payload={() =>
            text === ''
              ? null
              : {
                  kind: 'text',
                  mime: 'text/plain',
                  text,
                  sourceTool: definition.id,
                }
          }
        />
      </Inline>
      <TextInputPanel
        value={text}
        onChange={doc.set}
        language="plain"
        label="Text"
        samples={SAMPLES}
        downloadName="text.txt"
        handoff={acceptsText}
        placeholder="Type or paste text"
        wrap
        minHeight={200}
      />
      <Grid cols={{ base: 1, lg: 2 }} gap="8">
        <Stack gap="8">
          <OpsPanel
            ops={ops}
            onRun={runOp}
            settings={settings}
            update={update}
            filter={filter}
            onFilter={setFilter}
          />
        </Stack>
        <Stack gap="8">
          <ReplacePanel
            text={text}
            runner={runner}
            options={findOptions}
            onOptions={onFindOptions}
            onReplace={onReplace}
          />
          <StatsPanel
            text={text}
            locale={settings.locale}
            stopWords={settings.stopWords}
            onLocale={(locale) => update({ locale })}
            onStopWords={(stopWords) => update({ stopWords })}
          />
        </Stack>
      </Grid>
    </Stack>
  );
}
