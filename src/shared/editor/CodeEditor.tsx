import {
  Button,
  Inline,
  LiveRegion,
  Text,
  VisuallyHidden,
} from '@arshad-shah/cynosure';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
} from '@codemirror/language';
import { lintGutter, lintKeymap, setDiagnostics } from '@codemirror/lint';
import {
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
  searchPanelOpen,
} from '@codemirror/search';
import {
  ChangeSet,
  Compartment,
  EditorSelection,
  EditorState,
  Prec,
  Transaction,
  type Extension,
} from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers as lineNumberGutter,
  placeholder as placeholderText,
  type Panel,
} from '@codemirror/view';
import {
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { runAppShortcut } from '@/shared/lib/hotkeys';
import {
  buildFolds,
  buildMarks,
  describeDiagnostic,
  foldsField,
  marksField,
  setFolds,
  setMarks,
  toDiagnostics,
  type FoldSlots,
} from './decorations';
import { FindPanel } from './FindPanel';
import { loadLanguage } from './languages';
import { cynosureEditorTheme, singleLineTheme, sizeTheme } from './theme';
import type { CodeEditorProps } from './types';

/** Characters past which an editor enters large-document mode. */
export const LARGE_DOCUMENT = 2_000_000;

/** Languages whose brackets and quotes close themselves. */
const PAIRED = new Set(['json', 'js', 'ts', 'css', 'html', 'xml', 'sql']);

/** Marks a transaction that came from a new `value` prop, not the user. */
const external = Transaction.userEvent.of('tools.external');

/** Drops newlines from every insertion: a one-line field stays one line. */
const oneLineFilter = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || tr.newDoc.lines === 1) return tr;
  const changes: { from: number; to: number; insert: string }[] = [];
  let lastEnd = 0;
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, text) => {
    changes.push({
      from: fromA,
      to: toA,
      insert: text.toString().replace(/\r?\n/g, ''),
    });
    lastEnd = toA;
  });
  const set = ChangeSet.of(changes, tr.startState.doc.length);
  return {
    changes: set,
    selection: EditorSelection.cursor(set.mapPos(lastEnd, 1)),
    scrollIntoView: true,
    userEvent: tr.annotation(Transaction.userEvent),
  };
});

/**
 * The one change turning `from` into `to` (their common start and end
 * kept), so the selection and undo history survive an outside update.
 */
function diffChange(from: string, to: string) {
  if (from === to) return null;
  const max = Math.min(from.length, to.length);
  let start = 0;
  while (start < max && from.charCodeAt(start) === to.charCodeAt(start))
    start++;
  let end = 0;
  while (
    end < max - start &&
    from.charCodeAt(from.length - 1 - end) ===
      to.charCodeAt(to.length - 1 - end)
  )
    end++;
  return {
    from: start,
    to: from.length - end,
    insert: to.slice(start, to.length - end),
  };
}

/** The fold gutter's marker: a chevron drawn by the theme (no glyph). */
function foldMarker(open: boolean): HTMLElement {
  const el = document.createElement('span');
  el.className = open ? 'cm-tl-fold-marker' : 'cm-tl-fold-marker cm-tl-closed';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

interface Compartments {
  language: Compartment;
  editable: Compartment;
  wrap: Compartment;
  gutter: Compartment;
  attrs: Compartment;
  size: Compartment;
  placeholder: Compartment;
  tab: Compartment;
  find: Compartment;
}

const compartments = (): Compartments => ({
  language: new Compartment(),
  editable: new Compartment(),
  wrap: new Compartment(),
  gutter: new Compartment(),
  attrs: new Compartment(),
  size: new Compartment(),
  placeholder: new Compartment(),
  tab: new Compartment(),
  find: new Compartment(),
});

/**
 * Tools' code editor: CodeMirror 6 used directly, themed from Cynosure tokens
 * (theme.ts). Controlled (`value` + `onChange`) or uncontrolled
 * (`defaultValue`). Highlighting per language (loaded on demand), line
 * numbers or custom gutter labels, lint diagnostics with gutter markers and
 * a polite status for the first error, find and replace in Cynosure
 * controls (Mod+F), line and range marks, folds with a Cynosure "Show N
 * hidden lines" button, a one-line mode, and a large-document mode.
 *
 * Tab indents; Escape then Tab moves focus out (no keyboard trap).
 */
export function CodeEditor({
  value,
  defaultValue = '',
  onChange,
  language = 'plain',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  readOnly = false,
  wrap = false,
  lineNumbers,
  lineLabels,
  placeholder,
  tabSize = 2,
  diagnostics,
  lineDecorations,
  ranges,
  folds,
  onUnfold,
  singleLine = false,
  onSubmit,
  find = true,
  largeDocument,
  onSelectionChange,
  onScroll,
  minHeight,
  maxHeight = 480,
  ref,
}: CodeEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [comp] = useState(compartments);
  const hintId = useId();
  // The last text this editor holds or emitted, so an echoed `value` is
  // not dispatched back.
  const known = useRef<string>(value ?? defaultValue);
  const [panel, setPanel] = useState<{
    el: HTMLElement;
    view: EditorView;
  } | null>(null);
  const [panelTick, setPanelTick] = useState(0);
  const [focusTick, setFocusTick] = useState(0);
  // Bumped after each user edit: a controlled editor whose owner kept the
  // old value (an input limit) goes back to it on the next render.
  const [edits, setEdits] = useState(0);
  const [foldSlots, setFoldSlots] = useState<ReadonlyMap<HTMLElement, number>>(
    () => new Map(),
  );

  const emitChange = useEffectEvent((text: string) => onChange?.(text));
  const emitSelection = useEffectEvent((from: number, to: number) =>
    onSelectionChange?.(from, to),
  );
  const emitScroll = useEffectEvent((pos: { top: number; left: number }) =>
    onScroll?.(pos),
  );
  const submit = useEffectEvent(() => onSubmit?.());

  const slots = useMemo<FoldSlots>(
    () => ({
      attach: (index, el) => setFoldSlots((m) => new Map(m).set(el, index)),
      detach: (el) =>
        setFoldSlots((m) => {
          const next = new Map(m);
          next.delete(el);
          return next;
        }),
    }),
    [],
  );

  const hasFolds = (folds?.length ?? 0) > 0;
  const locked = readOnly || hasFolds;
  const large =
    typeof largeDocument === 'boolean'
      ? largeDocument
      : (value ?? defaultValue).length > (largeDocument ?? LARGE_DOCUMENT);
  const gutter = !singleLine && (lineNumbers ?? true);
  const findOn = find && !singleLine;
  const label = ariaLabel ?? 'Code editor';

  // Each group of options as one extension, rebuilt when its inputs change.
  // Brackets and quotes close themselves in code, not in prose, logs or
  // one-line fields (a regex pattern means the "(" it types).
  const pairs = !singleLine && PAIRED.has(language);
  const editableExt = useMemo<Extension>(
    () => [
      EditorState.readOnly.of(locked),
      locked ? [] : [history(), pairs ? closeBrackets() : []],
    ],
    [locked, pairs],
  );
  const wrapExt = useMemo<Extension>(
    () => (wrap && !large && !singleLine ? EditorView.lineWrapping : []),
    [wrap, large, singleLine],
  );
  const gutterExt = useMemo<Extension>(() => {
    if (singleLine) return singleLineTheme;
    const parts: Extension[] = [];
    if (gutter)
      parts.push(
        lineNumberGutter(
          lineLabels
            ? {
                formatNumber: (n) => {
                  const l = lineLabels[n - 1];
                  return l === null || l === undefined ? '' : String(l);
                },
              }
            : {},
        ),
      );
    if (diagnostics?.length) parts.push(lintGutter());
    if (!locked && !large)
      parts.push(highlightActiveLine(), highlightActiveLineGutter());
    if (!large) parts.push(bracketMatching(), highlightSelectionMatches());
    // Language folding (JSON objects, Markdown sections, XML elements), off
    // where the tool folds lines itself or the document is huge.
    if (gutter && !large && !hasFolds)
      parts.push(foldGutter({ markerDOM: foldMarker }));
    if (!locked && !large) parts.push(indentOnInput());
    return parts;
  }, [
    singleLine,
    gutter,
    lineLabels,
    diagnostics?.length,
    locked,
    large,
    hasFolds,
  ]);
  const describedBy =
    [ariaDescribedBy, !locked && !singleLine ? hintId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  const invalid = !!diagnostics?.some((d) => d.severity === 'error');
  const attrsExt = useMemo<Extension>(() => {
    const attrs: Record<string, string> = {
      'aria-label': label,
      spellcheck: 'false',
      autocapitalize: 'off',
      autocorrect: 'off',
    };
    if (ariaLabelledBy) {
      delete attrs['aria-label'];
      attrs['aria-labelledby'] = ariaLabelledBy;
    }
    if (describedBy) attrs['aria-describedby'] = describedBy;
    if (locked) attrs['aria-readonly'] = 'true';
    if (singleLine) attrs['aria-multiline'] = 'false';
    if (invalid) attrs['aria-invalid'] = 'true';
    return EditorView.contentAttributes.of(attrs);
  }, [label, ariaLabelledBy, describedBy, locked, singleLine, invalid]);
  const sizeExt = useMemo(
    () =>
      sizeTheme(
        singleLine ? undefined : minHeight,
        singleLine ? 'none' : maxHeight,
      ),
    [singleLine, minHeight, maxHeight],
  );
  const placeholderExt = useMemo<Extension>(
    () => (placeholder ? placeholderText(placeholder) : []),
    [placeholder],
  );
  const tabExt = useMemo<Extension>(
    () => [EditorState.tabSize.of(tabSize), indentUnit.of(' '.repeat(tabSize))],
    [tabSize],
  );
  const findExt = useMemo<Extension>(
    () =>
      findOn
        ? [
            search({
              top: true,
              createPanel: (view): Panel => {
                const dom = document.createElement('div');
                return {
                  dom,
                  top: true,
                  mount: () => setPanel({ el: dom, view }),
                  destroy: () => setPanel(null),
                };
              },
            }),
            Prec.high(
              keymap.of([
                {
                  key: 'Mod-f',
                  run: (view) => {
                    openSearchPanel(view);
                    setFocusTick((n) => n + 1);
                    return true;
                  },
                },
                ...searchKeymap.filter((k) => k.key !== 'Mod-f'),
              ]),
            ),
          ]
        : [],
    [findOn],
  );

  // Create the view once; later prop changes reconfigure it.
  const initial = useRef({
    editableExt,
    wrapExt,
    gutterExt,
    attrsExt,
    sizeExt,
    placeholderExt,
    tabExt,
    findExt,
  });
  useLayoutEffect(() => {
    const parent = mountRef.current;
    if (!parent) return;
    const i = initial.current;
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: known.current,
        extensions: [
          comp.language.of([]),
          comp.editable.of(i.editableExt),
          comp.wrap.of(i.wrapExt),
          comp.gutter.of(i.gutterExt),
          comp.attrs.of(i.attrsExt),
          comp.size.of(i.sizeExt),
          comp.placeholder.of(i.placeholderExt),
          comp.tab.of(i.tabExt),
          comp.find.of(i.findExt),
          singleLine
            ? [
                oneLineFilter,
                Prec.highest(
                  keymap.of([
                    {
                      key: 'Enter',
                      run: () => {
                        submit();
                        return true;
                      },
                    },
                  ]),
                ),
              ]
            : [],
          // A tool's shortcut (Mod+B in Markdown) wins over a CodeMirror
          // binding for the same key: the key goes on to the app.
          Prec.highest(
            EditorView.domEventHandlers({ keydown: (e) => runAppShortcut(e) }),
          ),
          highlightSpecialChars(),
          drawSelection(),
          marksField,
          foldsField,
          cynosureEditorTheme,
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...lintKeymap,
            ...foldKeymap,
            ...(singleLine ? [] : [indentWithTab]),
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              const next = u.state.doc.toString();
              known.current = next;
              const fromProp = u.transactions.some((tr) =>
                tr.isUserEvent('tools.external'),
              );
              if (!fromProp) {
                emitChange(next);
                setEdits((n) => n + 1);
              }
            }
            if (u.selectionSet) {
              const m = u.state.selection.main;
              emitSelection(m.from, m.to);
            }
            if (searchPanelOpen(u.state)) setPanelTick((n) => n + 1);
          }),
          EditorView.domEventHandlers({
            scroll: (_e, v) => {
              emitScroll({
                top: v.scrollDOM.scrollTop,
                left: v.scrollDOM.scrollLeft,
              });
            },
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The view lives as long as the component; one-line mode is fixed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new controlled value replaces the text (keeping the caret in range),
  // and an edit the owner did not take is undone.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === undefined || value === known.current) return;
    known.current = value;
    const change = diffChange(view.state.doc.toString(), value);
    if (change) view.dispatch({ changes: change, annotations: external });
  }, [value, edits]);

  const reconfigure = (c: Compartment, ext: Extension) =>
    viewRef.current?.dispatch({ effects: c.reconfigure(ext) });
  useEffect(() => reconfigure(comp.editable, editableExt), [comp, editableExt]);
  useEffect(() => reconfigure(comp.wrap, wrapExt), [comp, wrapExt]);
  useEffect(() => reconfigure(comp.gutter, gutterExt), [comp, gutterExt]);
  useEffect(() => reconfigure(comp.attrs, attrsExt), [comp, attrsExt]);
  useEffect(() => reconfigure(comp.size, sizeExt), [comp, sizeExt]);
  useEffect(
    () => reconfigure(comp.placeholder, placeholderExt),
    [comp, placeholderExt],
  );
  useEffect(() => reconfigure(comp.tab, tabExt), [comp, tabExt]);
  useEffect(() => reconfigure(comp.find, findExt), [comp, findExt]);

  // Highlighting: the language support loads on demand.
  const shownLanguage = large ? 'plain' : language;
  useEffect(() => {
    let live = true;
    void loadLanguage(shownLanguage).then((ext) => {
      if (live)
        viewRef.current?.dispatch({ effects: comp.language.reconfigure(ext) });
    });
    return () => {
      live = false;
    };
  }, [comp, shownLanguage]);

  // Marks, folds and diagnostics follow their props (and the text).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: setMarks.of(buildMarks(view.state, { lineDecorations, ranges })),
    });
  }, [lineDecorations, ranges, value]);
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: setFolds.of(buildFolds(view.state, folds ?? [], slots)),
    });
  }, [folds, slots, value]);
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch(
      setDiagnostics(view.state, toDiagnostics(view.state, diagnostics ?? [])),
    );
  }, [diagnostics, value]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => viewRef.current?.focus(),
      setSelection(start, end, opts) {
        const view = viewRef.current;
        if (!view) return;
        const len = view.state.doc.length;
        view.dispatch({
          selection: {
            anchor: Math.min(start, len),
            head: Math.min(end, len),
          },
          scrollIntoView: opts?.scroll !== false,
        });
      },
      scrollToLine(n) {
        const view = viewRef.current;
        if (!view) return;
        const line = view.state.doc.line(
          Math.max(1, Math.min(n, view.state.doc.lines)),
        );
        view.dispatch({
          effects: EditorView.scrollIntoView(line.from, { y: 'start' }),
        });
      },
      scrollToPosition({ top, left }) {
        const el = viewRef.current?.scrollDOM;
        if (!el) return;
        if (top !== undefined) el.scrollTop = top;
        if (left !== undefined) el.scrollLeft = left;
      },
      get view() {
        return viewRef.current;
      },
    }),
    [],
  );

  const firstError = diagnostics?.find((d) => d.severity === 'error');

  return (
    <>
      <div ref={mountRef} data-code-editor="" />
      {panel
        ? createPortal(
            <FindPanel
              view={panel.view}
              readOnly={locked}
              tick={panelTick}
              focusTick={focusTick}
              label={label}
            />,
            panel.el,
          )
        : null}
      {[...foldSlots].map(([el, index]) => {
        const fold = folds?.[index];
        if (!fold) return null;
        const n = fold.toLine - fold.fromLine + 1;
        return createPortal(
          <Inline gap="3" align="center" wrap>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onUnfold?.(index)}
              disabled={!onUnfold}
            >
              {`Show ${n} hidden ${n === 1 ? 'line' : 'lines'}`}
            </Button>
            {fold.label ? (
              <Text size="xs" tone="muted" truncate>
                {fold.label}
              </Text>
            ) : null}
          </Inline>,
          el,
        );
      })}
      {!locked && !singleLine ? (
        <VisuallyHidden id={hintId}>
          Tab indents. Press Escape, then Tab, to move focus out of the editor.
        </VisuallyHidden>
      ) : null}
      <LiveRegion>
        {firstError ? describeDiagnostic(firstError) : ''}
      </LiveRegion>
    </>
  );
}
