import { Card, IconButton, Stack, TextArea } from '@arshad-shah/cynosure';
import {
  download,
  redo as redoIcon,
  undo as undoIcon,
} from '@arshad-shah/cynosure/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ToolProps } from '@/app/tool';
import { TextSourceActions } from '@/app/ui/text-source';
import { SendToMenu, ToolActions, TransformLayout } from '@/app/ui/transform';
import { saveBlob } from '@/shared/lib/download';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useToolCommands, type ToolCommand } from '@/shared/lib/tool-commands';
import { createRegexRunner } from '@/tools/regex-tester/lib/runner';
import { OpsPanel } from './components/OpsPanel';
import { ReplacePanel } from './components/ReplacePanel';
import { StatsPanel } from './components/StatsPanel';
import { useUndoableText } from './hooks/useUndoableText';
import type { FindOptions } from './lib/find';
import { buildOps, type TextOp } from './lib/ops';
import { toolkitSettings } from './settings';

const SAMPLE =
  'The quick brown fox jumps over the lazy dog. The dog sleeps.\n\nBananas\napples\ncherries\napples\n  Dates  \n';

const acceptsText = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'text/plain';

const UNDO_SHORTCUT = 'Mod+Z';
const REDO_SHORTCUT = 'Mod+Shift+Z';

/**
 * Text Toolkit (redesign spec, transform pattern): the text beside its
 * operations (case, lines, clean-up), find and replace, and statistics.
 */
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

  const textCard = (
    <Card as="section" title="Text">
      <Stack gap="5">
        <TextArea
          label="Text"
          labelHidden
          rows={10}
          maxRows={40}
          placeholder="Type or paste text."
          value={text}
          onChange={doc.set}
        />
        <TextSourceActions
          value={text}
          onChange={doc.set}
          label="Text"
          handoff={acceptsText}
          onExample={() => doc.set(SAMPLE)}
        >
          <IconButton
            size="sm"
            variant="ghost"
            tone="neutral"
            icon={undoIcon}
            label="Undo"
            aria-keyshortcuts="Control+Z"
            disabled={!canUndo}
            onClick={onUndo}
          />
          <IconButton
            size="sm"
            variant="ghost"
            tone="neutral"
            icon={redoIcon}
            label="Redo"
            aria-keyshortcuts="Control+Shift+Z"
            disabled={!canRedo}
            onClick={redo}
          />
          {text ? (
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={download}
              label="Download text.txt"
              onClick={() =>
                saveBlob(new Blob([text], { type: 'text/plain' }), 'text.txt')
              }
            />
          ) : null}
        </TextSourceActions>
      </Stack>
    </Card>
  );

  const panels = (
    <Stack gap="6">
      <OpsPanel
        ops={ops}
        onRun={runOp}
        settings={settings}
        update={update}
        filter={filter}
        onFilter={setFilter}
      />
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
  );

  return (
    <Stack gap="6">
      <ToolActions>
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
      </ToolActions>
      <TransformLayout start={textCard} end={panels} defaultSize={55} />
    </Stack>
  );
}
