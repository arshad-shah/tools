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

/**
 * `x.style` (dot or ['style'] access).
 * @param {any} n
 */
const isStyleMember = (n) =>
  n?.type === 'MemberExpression' &&
  ((!n.computed &&
    n.property.type === 'Identifier' &&
    n.property.name === 'style') ||
    (n.computed &&
      n.property.type === 'Literal' &&
      n.property.value === 'style'));

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
      imperative:
        'Inline styles written imperatively ({{how}}) live only in src/shared/ui. Use a kit primitive such as Positioned (spec 1A R2).',
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
      /** `el.style.left = ...`, `el.style['top'] += ...`. @param {any} node */
      AssignmentExpression(node) {
        const l = node.left;
        if (l.type === 'MemberExpression' && isStyleMember(l.object))
          context.report({
            node,
            messageId: 'imperative',
            data: { how: 'element.style.*' },
          });
      },
      /** @param {any} node */
      CallExpression(node) {
        const c = node.callee;
        // el.style.setProperty(...), el.style.removeProperty(...)
        if (c.type === 'MemberExpression' && isStyleMember(c.object)) {
          context.report({
            node,
            messageId: 'imperative',
            data: { how: 'element.style.*' },
          });
          return;
        }
        // el.setAttribute('style', ...)
        const first = node.arguments[0];
        if (
          c.type === 'MemberExpression' &&
          c.property.type === 'Identifier' &&
          c.property.name === 'setAttribute' &&
          ((first?.type === 'Literal' && first.value === 'style') ||
            (first?.type === 'TemplateLiteral' &&
              first.expressions.length === 0 &&
              first.quasis[0].value.cooked === 'style'))
        ) {
          context.report({
            node,
            messageId: 'imperative',
            data: { how: "setAttribute('style')" },
          });
          return;
        }
        // Object.assign(el.style, {...})
        if (
          c.type === 'MemberExpression' &&
          c.object.type === 'Identifier' &&
          c.object.name === 'Object' &&
          c.property.type === 'Identifier' &&
          c.property.name === 'assign' &&
          isStyleMember(first)
        ) {
          context.report({
            node,
            messageId: 'imperative',
            data: { how: 'Object.assign(element.style)' },
          });
          return;
        }
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
