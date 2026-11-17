# Icon gaps: Facet icons tools still needs (Phase 3.2)

Every kit icon in tools is now a Facet icon (`@arshad-shah/cynosure/icons` 0.6.0) or a Cynosure brand mark. tools draws none of its own. Where Facet has no exact icon, the closest Facet icon stands in until Cynosure draws the right one. Each entry below says what the icon must show and where tools uses it.

## To draw in Cynosure (used, stand-in meanwhile)

| tools name                                | Must show                                                                                      | Used in                                                                                                   | Stand-in now          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------- |
| `IconFlipHorizontal` / `IconFlipVertical` | Mirror an image left to right / top to bottom: a shape and its reflection across a dashed axis | `src/tools/image-annotate/components/EditBar.tsx` ("Flip horizontally", "Flip vertically", named buttons) | `swap`, same for both |
| `IconPixelate`                            | Pixelate a region: a frame whose inside is coarse uneven blocks (not a table or grid)          | `src/tools/image-annotate/components/ToolPalette.tsx` ("Pixelate (redact)")                               | `grid`                |
| `IconImageCode`                           | Code as an image: an image frame with code brackets                                            | `src/tools/code-to-image/index.ts` (tool icon)                                                            | `image`               |
| `IconStepMarker`                          | A numbered callout: a circle with a numeral                                                    | `src/tools/image-annotate/components/ToolPalette.tsx` ("Numbered step")                                   | `list-ordered`        |
| `IconKeyPair`                             | A public/private key pair: two keys, or a key with a padlock                                   | `src/tools/keypair-generator/index.ts` (tool icon)                                                        | `key`                 |

Resolved by Facet 0.8.0 and now used: `delete-left` (calculator Backspace, was `arrow-left`), `file-repair` (PDF Repair, was `wrench`); the `panel-*-open` / `panel-*-close` rows went with tools' own split pane, which Cynosure's `SplitPane` replaced.

## Mapped to an existing Facet icon (no gap, listed for review)

Several tools names share one Facet icon: `IconCheckCircle`, `IconCheckCircle2` → `check-circle`; `IconTrash`, `IconTrash2` → `trash`; `IconCode`, `IconCodeXml` → `code`; `IconBarChart2`, `IconBarChart3` → `chart-bar`; `IconKey`, `IconKeyRound` → `key`; `IconRotateCw` → `rotate`; `IconReply`, `KeyEnter` → `corner-down-left`; `IconMyDetails` → `id-card`; `IconScaling` (page size) → `scale`; `IconBox` → `package`; `IconInsertBlankPage` → `file-plus`; `IconTimestamp` → `timer`; `IconRedactVerified` → `shield-check`; `IconSelectTool` → `cursor`; `IconShareLink` → `share`; `IconSendTo` → `forward`; `IconOcrLanguage` → `languages`; `IconCropPage` → `crop`. `IconStarFilled` is Facet's `star` filled (`{ ...star, fill: true }`, as Cynosure's Rating fills it); `IconGithub` is the `github` brand mark.

## Dropped (tools never used them, and Facet has no distinct icon for them)

Removed from `@/shared/ui/icons`, not needed unless a tool starts using one: `IconBarChart4`, `IconBitToggle`, `IconBitcoin`, `IconBuilding2`, `IconDroplets`, `IconInitialPages`, `IconInkPen`, `IconInkWeight`, `IconLinearize`, `IconLink2`, `IconMoveRight`, `IconPhone`, `IconScale` (balance scales; Facet's `scale` is resize), `IconShieldOff`, `IconSignatureBlock`, `IconSnapToCell`, `IconSummaryPage`, `IconTraceSignature`, `KeyControl`, `KeyEscape`, `KeyOption`, `KeyShift`, `KeyTab`.
