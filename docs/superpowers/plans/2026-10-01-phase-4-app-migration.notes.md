# Phase 4 — PR E notes (splits, derived state, lint to zero)

Branch `feat/phase4-splits`, cut from master `d6897c1` (after the phase-6 P0 correctness fixes, PR #58).

## Gate (final tree)

| Step                             | Result                                           |
| -------------------------------- | ------------------------------------------------ |
| `pnpm lint` (`--max-warnings 0`) | 0 errors, 0 warnings (master had 25 warnings)    |
| `pnpm typecheck`                 | clean                                            |
| `pnpm test`                      | 139 files, 1038 tests passed (master: 112 / 883) |
| `pnpm build`                     | ok (regex worker still emitted as its own chunk) |
| `pnpm test:e2e` x3               | 162 / 162 passed, three consecutive runs         |

Third-party console-error allow-list entries added: none.

## Size gate — before / after (non-test files)

| Tool                  | Largest before                                    | Largest after                             | Files after |
| --------------------- | ------------------------------------------------- | ----------------------------------------- | ----------- |
| api-request           | `Tool.tsx` 896                                    | `Tool.tsx` 313                            | 14          |
| qr-code-generator     | `Tool.tsx` 1009, `hooks/useQrCode.ts` 297         | `hooks/useQrCode.ts` 274                  | 17          |
| rive-animation-player | `Tool.tsx` 979                                    | `hooks/useRivePlayer.ts` 344              | 16          |
| text-diff-checker     | `Tool.tsx` 801, `hooks/useIntelligentDiff.ts` 338 | `hooks/useIntelligentDiff.ts` 340         | 12          |
| csv-viewer            | `Tool.tsx` 844                                    | `Tool.tsx` 286                            | 15          |
| jwt-decode            | `Tool.tsx` 1142                                   | `lib/verify.ts` 323 (unchanged)           | 20          |
| regex-tester          | `Tool.tsx` 795                                    | `components/LivePreview.tsx` 128          | 21          |
| color-tester          | `Tool.tsx` 719                                    | `Tool.tsx` 234                            | 14          |
| calculator            | `hooks/useCalculator.ts` 666, `Tool.tsx` 656      | `hooks/useCalculator.ts` 297              | 19          |
| unit-converter        | `Tool.tsx` 602                                    | `Tool.tsx` 195                            | 7           |
| random-data-generator | `lib/schema.ts` 775, `Tool.tsx` 460               | `lib/generate.ts` 375 (mostly word lists) | 8           |
| log-parser            | `Tool.tsx` 528, `lib/parse.ts` 374                | `Tool.tsx` 296                            | 11          |
| json-and-xml-viewer   | `Tool.tsx` 457                                    | `Tool.tsx` 289                            | 15          |
| password-generator    | `Tool.tsx` 402                                    | `lib/secure-random.ts` 178                | 9           |
| number-converter      | `Tool.tsx` 379                                    | `Tool.tsx` 298                            | 4           |
| url-encoder-decoder   | `Tool.tsx` 209                                    | `Tool.tsx` 183                            | 3           |
| url-parser            | `Tool.tsx` 330                                    | `Tool.tsx` 293                            | 4           |

No file under `src/tools` exceeds 400 lines. Outside the tools, `src/pdf/edit/ops.ts` (674) is the only file over 400; it is the PDF engine (phases 1–3), not in phase 4's scope.

## Lint warnings fixed in this PR (25 on master)

- set-state-in-effect → derived with `useMemo` over pure libs / moved into change handlers: color-tester, csv-viewer, json-and-xml-viewer, jwt-decode (`useJwtDecoder`), log-parser (`useLogParser`), number-converter, password-generator (lazy `useState`), qr-code-generator (`useQrCode` → `buildFinalData`), rive-animation-player, unit-converter (x2), url-encoder-decoder, url-parser.
- immutability: rive-animation-player (Rive instance in a ref).
- exhaustive-deps x2: json-and-xml-viewer (`xmlToJson`/`formatXML` at module scope in `lib/xml.ts`).
- no-useless-assignment: color-tester (`color-analysis.ts` x2, `color-convert.ts` x3), jwt-decode (`claims.ts`), random-data-generator (`schema.ts` x2).
- preserve-caught-error: text-diff-checker (`{ cause }`).
- Already fixed on master by P0 / earlier PRs: base64-converter, hash-generator, calculator (`useCalculator` immutability), `src/pdf/edit/load.ts`, Dashboard, ToolLayout, button.

`package.json` now runs `eslint . --max-warnings 0`.

## Deviations from the plan

- **Adapted to P0.** The plan predates P0. Where P0 already provides the pure function the plan asks for, it is reused rather than duplicated:
  - regex-tester: P0's `lib/match.ts` + worker `lib/runner.ts` replace the plan's `runRegex`; the set-state-in-effect it targeted was already gone.
  - jwt-decode: P0's `lib/jwt.ts` `decodeJwt` replaces the plan's `lib/decode.ts`; a non-throwing `tryDecodeJwt` wrapper sits next to it. Error messages are P0's.
  - calculator: P0's `lib/evaluate.ts` `evaluateExpression` and `lib/keys.ts` are reused; new `lib/scientific.ts`, `lib/display.ts`, `lib/expression.ts`, `lib/memory.ts`, `hooks/useCalculatorKeyboard.ts`.
  - json-and-xml-viewer: P0's `lib/parse.ts` reused; `lib/search.ts` builds on its `matchesSearch`.
  - base64-converter and hash-generator: already split and derived by P0 (`lib/convert.ts`, `lib/hash.ts`); no change.
- **Extra components/hooks** beyond the plan's lists, to keep files under 300 lines (e.g. qr `ContentTab`/`LogoPanel`/`AdvancedSettings`, rive `ControlsTab`/`useDebugLog`/`useInputValues`/`useCanvasSize`, jwt `TokenInput`/`TokenStatus`/`useSignatureVerification`, csv `useCsvData`/`ChartPanel`, regex `useRegexMatches`, text-diff `DiffSettingsPanel`/`DiffStats`, calculator `useCalculatorPanels`).
- **Icons.** `src/shared/ui/icons` does not exist on this base (P5-A1 adds it). Existing `lucide-react` imports were moved verbatim with their JSX; no new icon usages were added. P5-A1 / A2 rewrite them.
- **text-diff-checker** `textFile.ts` moved to `lib/text-file.ts` (with its test).
- **qr-code-generator** `isProcessing` removed: it was set and cleared inside one effect, so its spinner could never render (plan-sanctioned).
- **Rive** manual `.riv` check not done (no browser session for the executor); replaced by a jsdom hook test against a fake Rive runtime and a differential render of old vs new `Tool.tsx`.

## Small behaviour differences that follow from deriving state

- color-tester, url-parser, number-converter: the first paint now shows computed values instead of a one-frame placeholder.
- csv-viewer: until the user picks a chart column, the column follows the first numeric column of the current data (it used to latch once and could point at a vanished column after a delimiter re-parse). This is the plan's prescribed derivation.

## Approved behaviour changes as shipped

B1–B6 and B8–B10 shipped in PRs A–D (see the plan's table). This PR ships B7 and B11–B17, plus the review-round fixes R1–R10 (fix-round ruling: behaviour-touching minors are fixed honestly and listed here).

| #   | Tool                   | Before                                                                                                                                     | After                                                                                                                                                                                                 |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B7  | number-converter       | Invalid input showed the error and kept stale results                                                                                      | Error shown, results cleared                                                                                                                                                                          |
| B10 | jwt-decode, log-parser | Keyed copy feedback (shipped in PR A)                                                                                                      | Kept through the split                                                                                                                                                                                |
| B11 | unit-converter         | Reusing a history entry from another category replaced its units with the category's first two                                             | The entry's own units are kept                                                                                                                                                                        |
| B12 | random-data-generator  | Editing a nested field (name, type, min/max, array size, required) did nothing; renaming remounted the card (focus lost, object collapsed) | Nested edits apply at any depth; cards and expand state are keyed by a stable id, so focus stays and objects stay open                                                                                |
| B13 | text-diff-checker      | "Inline" rendered exactly like "Unified"                                                                                                   | Real Inline view (restored from the pre-migration renderer): each modified line under the original it replaced; word/character modes flow as running text                                             |
| B14 | rive-animation-player  | Rive instances were dropped without `cleanup()` on reset, load error and unmount (WASM objects, renderer and document listeners leaked)    | Instances are disposed on reset, load error (deferred out of the runtime's own dispatch) and unmount; no instance is created without a canvas                                                         |
| B15 | rive-animation-player  | A failed load printed a bare "0" and no banner                                                                                             | The "Error loading animation" Alert shows                                                                                                                                                             |
| B16 | rive-animation-player  | Artboards hard-coded to `['Default']`, count 1, picker never shown, selection never reached Rive; fake `version`/`fps` fields              | Real artboards from the file, a working picker for multi-artboard files (`rive.reset({ artboard })`), real count; the fake fields are removed                                                         |
| B17 | rive-animation-player  | State-machine number/boolean input values carried over to a new file, state machine or artboard                                            | Cleared on reset, new state machine, artboard switch and new file                                                                                                                                     |
| R1  | rive-animation-player  | A second file flipped the controller tab back to Animations and re-applied nothing                                                         | The user's tab is kept and its first animation or state machine starts                                                                                                                                |
| R2  | rive-animation-player  | A resize or layout change during the file read was lost; resizing back to the first-render size was ignored                                | The new instance uses the latest size and layout; every resize is followed                                                                                                                            |
| R3  | qr-code-generator      | A failed encryption silently encoded the plaintext while the preview said "Encryption: AES"                                                | Danger Alert "Encryption failed", nothing is encoded, Download disabled                                                                                                                               |
| R4  | text-diff-checker      | An Auto-mode diff error escaped as an uncaught timer error with no feedback                                                                | `notify.error('Error calculating differences')`, as manual Refresh does                                                                                                                               |
| R5  | json-and-xml-viewer    | `formatXML` did not indent under single-character tag names                                                                                | Indents them like any other nesting                                                                                                                                                                   |
| R6  | calculator             | The History card showed whenever history was non-empty; the History button did nothing visible                                             | The card starts open when saved history exists (closed when empty) and the History button toggles it (exclusive with Memory and Saved, solid while open); opened empty it shows "No calculations yet" |
| R7  | unit-converter         | Two conversions saved in the same millisecond shared an id, and Remove deleted both                                                        | Ids from `newId()`; Remove deletes only the chosen entry                                                                                                                                              |
| R8  | random-data-generator  | "Add field to X" added under the first field named X (possibly a string field)                                                             | Adds under the card whose button was pressed (index path)                                                                                                                                             |
| R9  | color-tester           | Near-grey colours were named "WhiteRed", "BlackRed", "Gray (42%)Red"                                                                       | "White", "Black", "Gray (42%)"                                                                                                                                                                        |
| R10 | csv-viewer             | `chartPoints` passed strings and NaN typed as numbers (the chart dropped them)                                                             | `chartPoints` skips non-finite cells itself; the plotted chart is unchanged                                                                                                                           |

## Follow-ups (out of scope)

- Glyphs moved verbatim that conflict with the no-arrow/pictographic rule: csv-viewer sort header arrows, unit-converter history arrow, qr bullet characters, regex em dash. Deferred to P5-A2's restyle (review ruling).
- `src/pdf/components/PdfDropzone.test.tsx` "called 2 times" under load (review M17): owned by the P5-A1 fix round.

## Dependencies

No dependency changes in this PR.
