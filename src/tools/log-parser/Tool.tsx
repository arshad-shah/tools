import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Stack,
  TextInputPanel,
  type VirtualListHandle,
} from '@/shared/ui';
import { formatBytes } from '@/shared/lib/format';
import {
  useHandoff,
  useHandoffFiles,
  type HandoffPayload,
} from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { CustomFormatDialog } from './components/CustomFormatDialog';
import { FilterBar } from './components/FilterBar';
import { LogList } from './components/LogList';
import { OpenStatus } from './components/OpenStatus';
import { Timeline } from './components/Timeline';
import { ViewToolbar } from './components/ViewToolbar';
import { useDebounced } from './hooks/useDebounced';
import { useLogActions } from './hooks/useLogActions';
import { useLogInput, type LogInput } from './hooks/useLogInput';
import { useLogSource } from './hooks/useLogSource';
import { effectiveFilter, useLogView } from './hooks/useLogView';
import { useSampleLines } from './hooks/useSampleLines';
import { LOG_FILE_ACCEPT } from './lib/accept';
import type { CustomFormatDef } from './lib/custom-format';
import { EMPTY_FILTER, isEmptyFilter, type LogFilter } from './lib/filter';
import { customFormatId, formatName, toFormatRef } from './lib/format-ref';
import { readRegexHandoff, REGEX_FORMAT_MIME } from './lib/handoff';
import type { LogEntry } from './lib/model';
import { entryCount } from './lib/progress';
import { LOG_SAMPLE } from './lib/sample';
import { logSettings, type SavedFormat } from './settings';

const SAMPLES = [{ label: 'Java service log', value: LOG_SAMPLE }];
const FILTER_DEBOUNCE_MS = 150;
const isRegexHandoff = (p: HandoffPayload) => readRegexHandoff(p) !== null;
const isLogText = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime !== REGEX_FORMAT_MIME;

/** Per-log UI state (expanded rows, selection), dropped on a new log. */
function useForVersion<T>(version: number, initial: () => T) {
  const [state, setState] = useState(() => ({ version, value: initial() }));
  const value = state.version === version ? state.value : initial();
  const set = useCallback(
    (fn: (v: T) => T) =>
      setState((s) => ({
        version,
        value: fn(s.version === version ? s.value : initial()),
      })),
    [version, initial],
  );
  return [value, set] as const;
}

const newSet = () => new Set<number>();
const newMap = () => new Map<number, LogEntry>();

const LogViewer = () => {
  const navigate = useNavigate();
  const [settings, update] = logSettings.useSettings();
  const source = useLogSource();
  const formatRef = useMemo(
    () => toFormatRef(settings.format, settings.customFormats),
    [settings.format, settings.customFormats],
  );
  const { input, setInput, openFile } = useLogInput(source, formatRef);

  const [filter, setFilter] = useState<LogFilter>(EMPTY_FILTER);
  const checked = useMemo(() => effectiveFilter(filter), [filter]);
  const applied = useDebounced(checked.filter, FILTER_DEBOUNCE_MS);
  const view = useLogView(source, applied);
  const listRef = useRef<VirtualListHandle>(null);

  const [expanded, setExpanded] = useForVersion(source.version, newSet);
  const [selected, setSelected] = useForVersion(source.version, newMap);

  const toggle = useCallback(
    (i: number) =>
      setExpanded((s) => {
        const next = new Set(s);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        return next;
      }),
    [setExpanded],
  );
  const select = useCallback(
    (e: LogEntry, on: boolean) =>
      setSelected((m) => {
        const next = new Map(m);
        if (on && next.size < 2) next.set(e.index, e);
        else next.delete(e.index);
        return next;
      }),
    [setSelected],
  );
  const addField = useCallback(
    (f: LogFilter['fields'][number]) =>
      setFilter((cur) =>
        cur.fields.some(
          (x) => x.key === f.key && x.value === f.value && x.mode === f.mode,
        )
          ? cur
          : { ...cur, fields: [...cur.fields, f] },
      ),
    [],
  );

  // Custom format dialog: opened by the button, or by a Regex Tester hand-off.
  const regexPayload = useHandoff(isRegexHandoff);
  const [seenPayload, setSeenPayload] = useState<HandoffPayload | null>(null);
  const [dialog, setDialog] = useState<{
    open: boolean;
    initial?: CustomFormatDef;
  }>({ open: false });
  const fromHandoff = !!regexPayload && seenPayload !== regexPayload;
  const dialogOpen = dialog.open || fromHandoff;
  const closeDialog = () => {
    setDialog({ open: false });
    setSeenPayload(regexPayload);
  };
  const sampleLines = useSampleLines(source, dialogOpen);
  const saveFormat = (def: CustomFormatDef) => {
    const saved: SavedFormat = {
      name: def.name,
      pattern: def.pattern,
      flags: def.flags,
    };
    update({
      customFormats: [
        ...settings.customFormats.filter((f) => f.name !== def.name),
        saved,
      ],
      format: customFormatId(def.name),
    });
    closeDialog();
    notify.success(`Saved format ${def.name}`);
  };

  const clearAll = () => {
    setInput(null);
    setFilter(EMPTY_FILTER);
  };
  const actions = useLogActions({
    source,
    filter: applied,
    listRef,
    selected,
    navigate,
    onClear: clearAll,
    onSample: () => setInput({ kind: 'text', text: LOG_SAMPLE }),
    onNewFormat: () => setDialog({ open: true }),
    onClearFilters: () => setFilter(EMPTY_FILTER),
  });

  useHandoffFiles((files) => openFile(files[0]));

  const hasLog = source.status === 'ready';
  const total = source.info?.total ?? 0;
  const shown = view.filteredTotal;

  return (
    <Stack gap="4">
      <TextInputPanel
        label="Log"
        language="log"
        value={input?.kind === 'text' ? input.text : ''}
        onChange={(text) => setInput(text ? { kind: 'text', text } : null)}
        accept={LOG_FILE_ACCEPT}
        samples={SAMPLES}
        handoff={isLogText}
        onFile={(file) => {
          openFile(file);
          return true;
        }}
        placeholder="Paste a log, or open or drop a log file"
        wrap={settings.wrap}
        minHeight={120}
        maxHeight={240}
      />
      <FileLine input={input} onClose={clearAll} />
      <OpenStatus source={source} />
      {source.status === 'error' && source.error ? (
        <ErrorState title="Could not open this log" error={source.error} />
      ) : null}
      {hasLog ? (
        <>
          <div
            role="status"
            className="flex flex-wrap items-center gap-2 text-sm text-fg-muted"
          >
            <span>
              {shown === null
                ? `Filtering ${entryCount(total)}`
                : `${shown.toLocaleString('en-US')} of ${entryCount(total)}`}
            </span>
            {source.info ? (
              <Badge variant="soft" tone="neutral" size="sm">
                {settings.format === 'auto' ? 'Detected: ' : 'Format: '}
                {formatName(source.info.format)}
              </Badge>
            ) : null}
          </div>
          <ViewToolbar
            format={settings.format}
            onFormat={(format) => update({ format })}
            customFormats={settings.customFormats}
            onNewFormat={() => setDialog({ open: true })}
            wrap={settings.wrap}
            onWrap={(wrap) => update({ wrap })}
            hasLog={hasLog}
            onNextError={actions.nextError}
            onExport={actions.exportAs}
            selectedCount={selected.size}
            onCompare={actions.compare}
          />
          <FilterBar
            filter={filter}
            onChange={setFilter}
            levels={source.info?.levels ?? {}}
            searchError={checked.searchError}
          />
          {view.histogram ? (
            <Timeline
              histogram={view.histogram}
              range={filter.range}
              onRange={(range) => setFilter((f) => ({ ...f, range }))}
            />
          ) : null}
          {shown === 0 ? (
            <EmptyState
              title="No entries match"
              description={
                isEmptyFilter(applied)
                  ? 'This log has no entries.'
                  : 'Loosen or clear the filters to see more.'
              }
              actions={
                isEmptyFilter(applied) ? null : (
                  <Button size="sm" onClick={() => setFilter(EMPTY_FILTER)}>
                    Clear filters
                  </Button>
                )
              }
            />
          ) : shown !== null ? (
            <LogList
              listRef={listRef}
              total={shown}
              entryAt={view.entryAt}
              onRangeChange={view.onRangeChange}
              expanded={expanded}
              onToggle={toggle}
              selected={selected}
              onSelect={select}
              onFieldFilter={addField}
              onActiveChange={actions.setCursor}
              wrap={settings.wrap}
              search={applied.text}
            />
          ) : null}
        </>
      ) : null}
      <CustomFormatDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        initial={
          dialog.open
            ? dialog.initial
            : regexPayload
              ? (readRegexHandoff(regexPayload) ?? undefined)
              : undefined
        }
        sampleLines={sampleLines}
        onSave={saveFormat}
      />
    </Stack>
  );
};

function FileLine({
  input,
  onClose,
}: {
  input: LogInput | null;
  onClose(): void;
}) {
  if (input?.kind !== 'file') return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
      <span>
        File: <span className="font-mono text-fg">{input.file.name}</span> (
        {formatBytes(input.file.size)})
      </span>
      <Button size="sm" variant="ghost" onClick={onClose}>
        Close file
      </Button>
    </div>
  );
}

export default LogViewer;
