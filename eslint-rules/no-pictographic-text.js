// @ts-check
import { cookRegex, findBanned, hex } from './banned-glyphs.js';

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ban emoji, pictographic, arrow, shape and box-drawing glyphs in product text (spec 1A R3)',
    },
    messages: {
      banned:
        'Banned glyph {{cp}}. Use an icon from @/shared/ui/icons, Kbd, MetaList, StatusDot or plain words; recognise third-party glyphs with numeric code points.',
    },
    schema: [],
  },
  create(context) {
    /**
     * @param {import('estree').Node} node
     * @param {unknown} text
     */
    const check = (node, text) => {
      if (typeof text !== 'string') return;
      const hit = findBanned(text);
      if (hit)
        context.report({
          node,
          messageId: 'banned',
          data: { cp: hex(hit.codePoint) },
        });
    };
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
        if ('regex' in node && node.regex)
          check(node, cookRegex(node.regex.pattern));
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
      /** @param {any} node JSX nodes are not in the estree typings */
      JSXText(node) {
        check(node, node.value);
      },
    };
  },
};
export default rule;
