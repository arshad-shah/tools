# Tools identity

Tools makes everyday work simpler with private browser utilities.

## Signature

Use `src/app/Brand.tsx` for the product signature. It combines the modular T
mark in `public/brand/tools-mark.svg` with the Tools wordmark. The detached
stem suggests independent utilities that belong to one kit. The same asset
is the favicon. Keep clear space around it equal to half the mark height.
Do not stretch, rotate, or add shadows to the mark.

## Colour and type

The shared theme in `src/theme/terminal.css` is the source of truth.

| Role | Colour |
| --- | --- |
| Canvas | `#10130f` |
| Surface | `#181c17` |
| Accent | `#b6ec64` |
| Main text | `#f0f2eb` |
| Supporting text | `#b0b8a7` |

Use the system sans-serif stack for headings and interface text, with the
existing monospace stack for code, metadata, and short eyebrow labels.
Fonts remain local: no third-party font requests. Use lime sparingly for
identity, focus, active controls, and tool icons. Use dark ink on lime.

## Voice and layout

Lead with “Your everyday work, simplified.” Keep descriptions useful and
plain. Prefer “Find a tool” to terminal jargon. The dashboard uses rounded
cards and pill filters, reusing the existing shared UI and tool registry.
Decorative motion must respect reduced-motion preferences.
