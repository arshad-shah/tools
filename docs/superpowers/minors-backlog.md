# Minor findings backlog

Non-blocking review findings, cleared in P5-G (phase 5) and P6-H (phase 6). Append one line per item: `- <Part>: <file:line> <finding> -> <fix>`.

- P6-G1: verify Rive artboard switching (rive.reset({artboard})) with a real multi-artboard .riv file (from P4-E B16)
- Milestone e2e after P5-A2: confirm pdf-splitter (3) and encrypted (2) specs pass on a quiet machine (seen failing under load in P4-E)
- P6-H dependency sweep: GitHub Dependabot reports 35 vulnerabilities on master (1 critical, 13 high, 15 moderate, 6 low); resolve or document each
- P6-A3: src/shared/ui/menu.tsx DropdownMenuTrigger drops props such as aria-describedby, so a Tooltip cannot describe a menu trigger (DiagramCanvas Export uses aria-keyshortcuts instead) -> forward extra props from DropdownMenuTrigger to its child
- P6-A3: src/shared/diagram/layout-client.ts cancels by terminating the worker itself because killable-client does not exist on master yet -> switch to killable-client once it lands
- P6-A3: src/shared/ui/icons/custom/diagram.tsx defines IconLayoutLeftRight and IconLayoutTopBottom, which A2-16 also plans in custom/tools-p6.tsx -> whichever merges second drops its copy (same names, export \* would clash)
- P6-A3: src/shared/lib/theme-tokens.ts is created by A3 (A2-8 plans the same file) -> A2-8 reuses it
- P6-A3: src/shared/diagram/theme-bridge.ts falls back to fg/info/warning/accent-fg tokens until A1 adds --color-syntax-\* and match-soft -> drop the fallbacks once A1's tokens merge
- P6-A3: test/visual/kit-gallery.visual.ts adds the `diagram` section; its win32 baselines (light and dark) must be generated on the controller machine (pnpm test:visual --update-snapshots -g diagram)
- P6-A3: src/shared/diagram/metrics.ts createMeasure falls back to a document canvas when OffscreenCanvas is missing, which jsdom reports as "Not implemented" noise in tests that do not stub getContext -> harmless; silence if it gets in the way
- P5-A2: src/pdf/components/FileThumb.tsx:28 hover-preview panel is positioned with imperative `panel.style.left/top` (not caught by rule (b), which checks JSX style props) -> move the preview to the kit Popover or Positioned.
- P5-A2: src/shared/ui/adapters/RivePlayer.tsx is a canvas host (the player tool drives Rive imperatively), not the declarative `buffer/stateMachines` API in plan A2-10 -> move useRivePlayer's runtime wiring behind the adapter when the Rive tool is upgraded in phase 6.
- P5-A2: src/tools/image-optimizer/lib/convert.ts now needs OffscreenCanvas (Safari 16.4+); older browsers get UNSUPPORTED_FEATURE -> acceptable, or add a kit-owned canvas fallback.
- P5-A2: src/tools/hash-generator/Tool.tsx "Text to hash" label points at the textarea, which is hidden while a file is being hashed -> relabel the section ("Message") or point the label at the file row.
- P5-A2: rule (b) does not see imperative `element.style.*` writes or `setAttribute('style', ...)` -> extend the rule (MemberExpression on `.style` outside src/shared/ui).
- P5-G: Home category cards list 'Json and Xml Viewer' (title-cased id) instead of the tool's name 'JSON & XML Viewer'; use manifest title everywhere -> check hub/category card source
- P5-G: footer renders an empty item between separators ('36 tools • • Copyright') when build version/SHA is absent (visual test builds); hide empty items so separators never strand
