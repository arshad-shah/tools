# Cloud executor brief (shared by every Part)

You are the executor for one Part of the phase 5 / phase 6 plans of `arshad-shah/tools` (React 19, Vite 8, TypeScript 6, pnpm 10.11.0, Vitest, Playwright). A controller session on the owner's machine merges your PR and coordinates the Parts. The owner pre-approved this work end to end. Don't stop to ask; make a sensible call, record it in your PR description, and keep going.

## Read first

1. Your Part file in `docs/superpowers/cloud/` (it names the plan section, branch and boundary).
2. The plan section it points to, plus the plan's header (global constraints, parallelisation map).
3. The spec for your phase in `docs/superpowers/specs/`.
4. `docs/superpowers/rulings.md`: binding decisions R1–R38. Later rulings override earlier ones and the plan text.
5. `docs/superpowers/minors-backlog.md`.

## Binding rules

- **UI:** icons are SVG only, from `@/shared/ui/icons` (`lucide-react` may be imported only inside that module). Never hand-roll UI in a tool or mode. If the kit lacks something, add a component to `src/shared/ui` first, with a gallery entry, then use it. No emoji, ASCII art, or pictographic, arrow or box-drawing glyphs in any product text, toast, empty state or doc. Use icons and the `Kbd` component. Lint and a build-output scan enforce this.
- **TDD:** write a failing test first for every behaviour, then the code. Make one commit per plan task.
- **Git identity:** `Arshad shah <49516613+arshad-shah@users.noreply.github.com>`. End every commit message with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
- **Boundary:** stay inside your Part's boundary. If you must touch a shared file (barrels, registries, routes), keep the change minimal and additive so parallel Parts merge cleanly.
- **Secret scanning:** CI runs gitleaks. Don't write literals that look like credentials. For example, build test strings such as `keys="Mod+Shift+K"` from parts, and generate test keys at runtime.
- **Glyphs in tests:** build escape-bearing strings from code points (`String.fromCodePoint(0x2192)`). Never paste the raw character.

## Gate before you open the PR

Run each command on its own, all green:

- `pnpm lint`: 0 errors and 0 warnings (the script has `--max-warnings 0`).
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- E2E specs for your Part's own features only, e.g. `pnpm exec playwright test test/e2e/<your-specs> --workers=2`. The controller runs the full e2e suite at milestones.
- UI Parts also run `pnpm test:visual`. Update baselines only for intended changes, and say so in the PR.

## Self-review

Before the PR, go through your plan section task by task and confirm each item is done or has a recorded deviation. Re-check the UI rules above. Append any non-blocking leftovers to `docs/superpowers/minors-backlog.md` in your branch (`- <Part>: <file:line> <finding> -> <fix>`).

## Catching up with master

If `master` moves while you work and you need its changes, don't rebase commit by commit. Instead:

1. `git branch <part>-history`
2. `git fetch origin && git reset --hard origin/master`
3. `git merge --squash <part>-history`
4. Resolve the conflicts once, make one commit, and re-run the gate.

## Finish

1. Push your branch.
2. Open a PR into `master` with `gh pr create`. Use a conventional-commit title. The body covers the summary, task coverage, deviations, gate results and new behaviour changes, and ends with:
   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```
3. **Do not merge.** The controller merges.
4. End your session with a short report: the PR URL, the gate results and any concerns.

If the controller later sends review findings or a catch-up request into this session, address them on the same branch, push, and report again.
