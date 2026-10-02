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
- P6-A1: src/shared/lib/colour/ is where the colour engine lives (ruling R30); plan text for A2, G1 and others says `src/shared/lib/color/*` -> import from `@/shared/lib/colour`.
- P6-A1: src/shared/lib/crypto/checksum.ts XXH64 and XXH3-64 run on BigInt (correct against the reference vectors, but slow on very large files) -> switch to 32-bit limb arithmetic if E's file hashing feels slow.
- P6-A1: src/shared/lib/handoff.ts useHandoff keeps P5's window.location plus history.replaceState reading (plan said useSearchParams), so react-router's location can show a stale ?handoff until the next navigation -> move to useSearchParams if a consumer reads the router location.
- P6-A1: src/shared/lib/syntax/languages/markup.ts leaves HTML script and style bodies as plain text -> embed the js and css tokenisers if CodeSurface needs them.
- P6-A1: src/shared/lib/killable-client.ts is added by A1 (P0 did not land it), so src/tools/regex-tester/lib/runner.ts and src/shared/diagram/layout-client.ts still hand-roll the kill-and-restart pattern -> C-1 and the A3 follow-up move them onto createKillableClient.
- P6-A1: cloud containers ship Chromium 1194, which lacks Map.prototype.getOrInsertComputed that pdfjs-dist 6 needs, so test/e2e/global-setup.ts warm-up fails there -> controller-side e2e is unaffected; cloud runs need a newer Chromium.
- P5-B: src/pdf/edit/font-cache.ts loadNotoSans loads fontsource's latin subset only (Latin-1 plus a few), so Greek, Cyrillic and many Latin Extended letters are refused by assertDrawable -> load latin-ext/greek/cyrillic subsets with per-character fallback, or a full OFL Noto Sans TTF.
- P5-B: src/pdf/workspace/modes/organize/OrganizeToolbar.tsx "Page size" and "Split" open Dialogs, not Popovers (kit ToolItem exposes no anchor) -> add an anchor ref to ToolItem and switch to Popover.
- P5-B: src/pdf/workspace/modes/organize/CropTool.tsx the frame lives in the cropped view, so a crop can only shrink (Reset crop restores the full page) -> show the uncropped page while the crop tool is active.
- P5-B: src/tools/pdf-edit/UnlockEditingDialog.tsx a restricted document restored from this device cannot be unlocked (the encrypted original is not stored) -> keep the original as a blob for restricted documents.
- P5-B: src/shared/ui/menu.tsx DropdownMenu has no arrow-key navigation inside the menu and Esc does not return focus to the trigger (seen in ModeTabs More and Toolbar split menus) -> roving focus in DropdownMenuContent.
- P5-B: src/shared/ui/selection-frame.tsx resizing a rotated frame uses the unrotated frame's axes -> rotate the drag delta into the frame's space.
- P5-B: src/app/gallery redaction ShapeLayer example uses the same fill and stroke, so its hatch is invisible -> use a contrasting stroke.
- P5-B: visual baselines needed on the controller (win32) and in the pinned container (linux): new test/visual/workspace.visual.ts (12 shots), kit-gallery drawer/dialog (restyled, Dialog gained size lg and a scrolling body) plus the new page-overlays, panels, workspace-bars and document sections, and app hub-pdf (Workspace group).
- P5-F: src/pdf/ocr/pool.ts a tesseract worker that dies after loading (Worker error event) leaves its job unsettled; aborts and job rejections are handled, a silent crash is not -> add a per-job watchdog or hook the worker's error event if tesseract.js exposes it.
- P5-F: src/pdf/doc/checkpoints/ocr.ts recognises pages in document order; spec 11 wants visible pages first -> F-7 passes the visible page ids so the runner orders its queue.
- P5-F: src/pdf/doc/types.ts CheckpointReport holds text lines only; F-7's rail badges ("Text added", "Low confidence") need per-page results -> add structured per-page OCR data to the report in F-7.
- P5-F: test/e2e-csp/csp.spec.ts visits the Rive player without a real .riv, so the Rive runtime's wasm fetch is not exercised under the policy -> add a small .riv fixture and load it.
- P5-F: scripts/copy-ocr-assets.mjs keys public/ocr/<v> by the tesseract.js version only; a tesseract.js-core bump alone reuses the path -> include the core version in the folder name once immutable cache headers are added.
