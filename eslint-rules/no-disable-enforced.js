// @ts-check
const ENFORCED =
  /local\/(no-pictographic-text|no-raw-ui-outside-kit|no-lucide-outside-icons|no-disable-enforced)\b/;
const DIRECTIVE =
  /^\s*(eslint-disable(?:-next-line|-line)?|eslint-enable|eslint)(?:\s+([^]*?))?\s*(?:--[^]*)?$/;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforced design-system rules cannot be disabled inline (spec 1A R4)',
    },
    messages: {
      named:
        'Enforced design-system rules cannot be disabled inline (spec 1A R4).',
      blanket:
        'Blanket eslint-disable comments are not allowed: they would silence enforced rules (spec 1A R4). Name the rule.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const c of context.sourceCode.getAllComments()) {
          const m = DIRECTIVE.exec(c.value);
          if (!m || !c.loc) continue;
          const [, kind, rest] = m;
          if (rest && ENFORCED.test(rest))
            context.report({ loc: c.loc, messageId: 'named' });
          else if (kind.startsWith('eslint-disable') && !rest?.trim())
            context.report({ loc: c.loc, messageId: 'blanket' });
        }
      },
    };
  },
};
