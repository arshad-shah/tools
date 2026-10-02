// @ts-check
/**
 * Rule (b), spec 1A R2: raw interactive and media elements, SVG and inline
 * styles live only in src/shared/ui. Everything else composes kit components.
 */
const BANNED = new Set([
  'button',
  'input',
  'select',
  'textarea',
  'svg',
  'img',
  'canvas',
  'video',
  'audio',
  'iframe',
  // SVG children: any SVG drawn outside the kit is hand-rolled UI too.
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'g',
  'defs',
  'use',
  'text',
  'tspan',
  'mask',
  'clipPath',
  'pattern',
  'linearGradient',
  'radialGradient',
  'stop',
  'marker',
  'symbol',
  'foreignObject',
  'image',
]);

/** @param {string} f */
const exempt = (f) =>
  /[\\/]src[\\/]shared[\\/]ui[\\/]/.test(f) ||
  /^src[\\/]shared[\\/]ui[\\/]/.test(f) ||
  // Test harnesses do not ship (decision G1).
  /\.test\.(ts|tsx)$/.test(f);

/** @param {any} p */
const isStyleProperty = (p) =>
  p.type === 'Property' &&
  ((p.key.type === 'Identifier' && p.key.name === 'style') ||
    (p.key.type === 'Literal' && p.key.value === 'style'));

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Raw elements and style props only inside src/shared/ui (spec 1A R2)',
    },
    messages: {
      element:
        'Raw <{{name}}> outside src/shared/ui. Use or add a kit component (spec 1A R2).',
      style:
        'style props live only in src/shared/ui (Positioned, BitmapCanvas, ...). Use a kit primitive (spec 1A R2).',
      dom: 'document.createElement("{{name}}") outside src/shared/ui. Use a kit component (spec 1A R2).',
    },
    schema: [],
  },
  create(context) {
    if (exempt(context.filename)) return {};
    return {
      /** @param {any} node */
      JSXOpeningElement(node) {
        const n = node.name;
        if (
          n.type === 'JSXIdentifier' &&
          /^[a-z]/.test(n.name) &&
          BANNED.has(n.name)
        )
          context.report({
            node,
            messageId: 'element',
            data: { name: n.name },
          });
        for (const attr of node.attributes) {
          if (
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'style'
          )
            context.report({ node: attr, messageId: 'style' });
          if (
            attr.type === 'JSXSpreadAttribute' &&
            attr.argument.type === 'ObjectExpression' &&
            attr.argument.properties.some(isStyleProperty)
          )
            context.report({ node: attr, messageId: 'style' });
        }
      },
      /** @param {any} node */
      CallExpression(node) {
        const c = node.callee;
        const name =
          c.type === 'Identifier'
            ? c.name
            : c.type === 'MemberExpression' && c.property.type === 'Identifier'
              ? c.property.name
              : '';
        if (name !== 'createElement' && name !== 'createElementNS') return;
        // createElementNS(namespace, tag)
        const arg = node.arguments[name === 'createElementNS' ? 1 : 0];
        const tag =
          arg?.type === 'Literal' && typeof arg.value === 'string'
            ? arg.value
            : arg?.type === 'TemplateLiteral' && arg.expressions.length === 0
              ? arg.quasis[0].value.cooked
              : null;
        if (!tag || !BANNED.has(tag)) return;
        const obj =
          c.type === 'MemberExpression' && c.object.type === 'Identifier'
            ? c.object.name
            : '';
        context.report({
          node,
          messageId: obj === 'document' ? 'dom' : 'element',
          data: { name: tag },
        });
      },
    };
  },
};
