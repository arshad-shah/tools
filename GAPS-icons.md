# Icon gaps: Facet icons tools still needs (Phase 3.2)

Every kit icon in tools is now a Facet icon (`@arshad-shah/cynosure/icons` 0.6.0) or a Cynosure brand mark. tools draws none of its own. Where Facet has no exact icon, the closest Facet icon stands in until Cynosure draws the right one. Each entry below says what the icon must show and where tools uses it.

## To draw in Cynosure (used, stand-in meanwhile)

| tools name                                     | Must show                                                                                     | Used in                                                                                                 | Stand-in now                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `KeyBackspace`                                 | Backspace / delete-left key: a left-pointing key outline with an x inside (the usual ⌫ shape) | `src/tools/calculator/components/Keypad.tsx` (the keypad's Backspace key, icon only, named "Backspace") | `arrow-left`                               |
| `IconPanelLeftClose` / `IconPanelLeftOpen`     | A left side panel with a chevron pointing in (collapse) / out (expand)                        | `src/shared/ui/split-pane.tsx` (collapse and expand buttons of a pane on the start edge)                | `sidebar`, same for both states            |
| `IconPanelRightClose` / `IconPanelRightOpen`   | A right side panel with a chevron pointing in / out                                           | `src/shared/ui/split-pane.tsx` (pane on the end edge)                                                   | `panel-right`, same for both states        |
| `IconPanelTopClose` / `IconPanelTopOpen`       | A top panel with a chevron pointing up (collapse) / down (expand)                             | `src/shared/ui/split-pane.tsx` (pane on the top edge)                                                   | `panel-top`, same for both states          |
| `IconPanelBottomClose` / `IconPanelBottomOpen` | A bottom panel with a chevron pointing down (collapse) / up (expand)                          | `src/shared/ui/split-pane.tsx` (pane on the bottom edge)                                                | `panel-bottom`, same for both states       |
| `IconRepair`                                   | Repair a PDF: a page with a wrench                                                            | `src/pdf/workspace/modes/optimize/OptimizeToolbar.tsx` ("Repair")                                       | `wrench` (reads correctly; loses the page) |

The split-pane buttons are named for their state ("Collapse … pane" / "Expand … pane"), so one panel icon for both states reads correctly; Cynosure's own SplitPane, once tools uses it, may make these unnecessary.

## Mapped to an existing Facet icon (no gap, listed for review)

Several tools names share one Facet icon: `IconCheckCircle`, `IconCheckCircle2` → `check-circle`; `IconTrash`, `IconTrash2` → `trash`; `IconCode`, `IconCodeXml` → `code`; `IconBarChart2`, `IconBarChart3` → `chart-bar`; `IconKey`, `IconKeyRound` → `key`; `IconRotateCw` → `rotate`; `IconReply`, `KeyEnter` → `corner-down-left`; `IconMyDetails` → `id-card`; `IconScaling` (page size) → `scale`; `IconBox` → `package`; `IconInsertBlankPage` → `file-plus`; `IconTimestamp` → `timer`; `IconRedactVerified` → `shield-check`; `IconSelectTool` → `cursor`; `IconShareLink` → `share`; `IconSendTo` → `forward`; `IconOcrLanguage` → `languages`; `IconCropPage` → `crop`. `IconStarFilled` is Facet's `star` filled (`{ ...star, fill: true }`, as Cynosure's Rating fills it); `IconGithub` is the `github` brand mark.

## Dropped (tools never used them, and Facet has no distinct icon for them)

Removed from `@/shared/ui/icons`, not needed unless a tool starts using one: `IconBarChart4`, `IconBitToggle`, `IconBitcoin`, `IconBuilding2`, `IconDroplets`, `IconInitialPages`, `IconInkPen`, `IconInkWeight`, `IconLinearize`, `IconLink2`, `IconMoveRight`, `IconPhone`, `IconScale` (balance scales; Facet's `scale` is resize), `IconShieldOff`, `IconSignatureBlock`, `IconSnapToCell`, `IconSummaryPage`, `IconTraceSignature`, `KeyControl`, `KeyEscape`, `KeyOption`, `KeyShift`, `KeyTab`.
