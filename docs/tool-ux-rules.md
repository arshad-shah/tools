# Tool UI and UX rules

How a tool page should feel: calm, few visible controls, one obvious next step,
and controls that line up. These rules sit on top of the design-system rules in
CONTRIBUTING.md (Cynosure only, no raw elements, no glyphs) and are checked in
review.

## 1. One size per row

Cynosure gives every control the same height for a size: `xs` 20 px, `sm` 26
px, `md` 32 px, `lg` 40 px. Heights only clash when sizes are mixed.

- Every control in one row (an `Inline`, a `Toolbar`, a card's header
  `actions`) has the same `size`: buttons, icon buttons, copy buttons, selects,
  text fields, number fields, segmented controls and switches alike.
- `md` (the default) is for forms and the main controls of a tool.
- `sm` is for dense places only: a card header's `actions`, the action row
  under an input (Paste, Open file, Clear), toolbars over a grid or editor, and
  rows inside a list. When a row is `sm`, all of it is `sm`.
- The primary action is never smaller than the fields it acts on.

## 2. A budget for buttons

- One primary action per view (`variant="solid"`, accent tone): the thing the
  tool is for (Generate, Send, Run, Convert). If the tool updates live, it has
  no primary button at all.
- At most three visible secondary buttons in a row. More go into a `Menu`
  ("More", or a named menu such as "Export" or "Open in"), and stay reachable
  from the Mod+K palette through `useToolCommands`.
- Page header actions (`ToolActions`): at most two, usually Share and Send to
  or Open in. Anything else belongs to a card.
- Rarely used operations do not get their own button. Group them in a
  `Select`/`Combobox` with one Apply button, a `Menu`, or a `Popover`.
- Never show the same action twice on one screen (a Copy in the card header
  and another on the code block; "Try an example" in the input row and in the
  empty state). Keep the one closest to the content.
- Icon-only buttons are for well-known actions only (copy, clear, undo, redo,
  download, delete, close) and always have a label (`label` on `IconButton`).

## 3. Show less, reveal on demand

- Options people rarely change go behind a `Popover` ("Options") or a closed
  `Disclosure`. Show what most people need on first load.
- A control that does nothing in the current state is hidden, not shown
  disabled, unless its being unavailable needs explaining (then a tooltip or
  description says why).
- Empty states have one call to action. The input area does not repeat it.
- Settings that only apply to one mode show only in that mode.

## 4. Layout

- Input on the start side, result on the end side (`TransformLayout`), or
  stacked on narrow screens. Do not add a third column.
- Group with cards; one card per job. Card titles are nouns ("Request",
  "Result"), actions are verbs.
- Labels are sentence case and short. Descriptions explain only what is not
  obvious.

## 5. Phones (390 px)

- No horizontal page scroll. Wide content (tables, code) scrolls inside its
  own container.
- Rows of actions wrap cleanly; nothing is clipped. A page header keeps at most
  two actions on one line.
- Tap targets stay at least 24 px (Cynosure's hit area already does this; do
  not shrink below `sm`).

## 6. "New" tags

`isNew: true` in a manifest shows a "New" badge on the card and the tool page.
It marks tools added in the latest release only. When a release adds tools,
the previous release's tags are removed.

## 7. Refining a tool without breaking it

- Move controls, do not delete features. Every action that existed stays
  reachable (in a menu, popover or the palette), with its keyboard shortcut.
- Accessible names may change only when the visible label changes; update the
  tests to match (prefer `getByRole` with the new name), never delete a test to
  make it pass.
