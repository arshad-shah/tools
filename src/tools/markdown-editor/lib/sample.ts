/** The sample document (spec §9.2): one of each common construct. */
export const SAMPLE_MARKDOWN = `# Project notes

A short **sample** document with _emphasis_, \`inline code\` and a [link](https://example.com).

## Tasks

- [x] Write the outline
- [ ] Review the draft
- [ ] Publish

## Steps

1. Open the editor
2. Type some Markdown
3. Export the result

## Table

| Name  | Role     | Status |
| ----- | -------- | ------ |
| Ada   | Engineer | Active |
| Grace | Admiral  | Away   |

## Code

\`\`\`js
function greet(name) {
  return \`Hello, \${name}\`;
}
\`\`\`

> Quotes stand out from the text around them.

---

Footnotes work too.[^1]

[^1]: This is the footnote.
`;
