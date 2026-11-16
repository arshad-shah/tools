// @ts-check
/**
 * Redesign spec, rule 1: pages are Cynosure components. Outside the
 * drawing surfaces no raw element (a lowercase JSX tag: div, span, p, ul,
 * section, h1, button, input, a, svg, canvas...), no `className`, no
 * `style` prop and no imperative style write. `document.createElement` of
 * an interactive, media or SVG element is a raw element too.
 *
 * Allowed in:
 * - src/shared/surfaces/: the product's drawing surfaces (canvases, frames,
 *   the virtual list, the code tree) and the DOM helpers they need;
 * - the editor and chart mount points (src/shared/editor/CodeEditor.tsx,
 *   src/shared/charts/ChartMount.tsx), where CodeMirror and swift-chart
 *   attach to an element;
 * - tests, which do not ship (decision G1).
 *
 * TODO(mig/rollout-pdf-workspace): src/pdf/**, src/tools/pdf-edit/** and
 * the old kit (src/shared/ui/**) are exempt until the PDF workspace
 * rebuild on that branch merges; then remove those three lines.
 */

/** Elements `createElement` may not make outside the surfaces. */
const DOM_BANNED = new Set([
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
const norm = (f) => f.replace(/\\/g, '/');

const EXEMPT = [
  /(^|\/)src\/shared\/surfaces\//,
  /(^|\/)src\/shared\/editor\/CodeEditor\.tsx$/,
  /(^|\/)src\/shared\/charts\/ChartMount\.tsx$/,
  // Tests do not ship (decision G1).
  /\.test\.(ts|tsx)$/,
  // TODO(mig/rollout-pdf-workspace): remove with the old kit.
  /(^|\/)src\/shared\/ui\//,
  /(^|\/)src\/pdf\//,
  /(^|\/)src\/tools\/pdf-edit\//,
];

/** @param {string} f */
const exempt = (f) => EXEMPT.some((re) => re.test(norm(f)));

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
        'Raw elements, className and style only in src/shared/surfaces and the editor and chart mount points (redesign spec, rule 1)',
    },
    messages: {
      element:
        'Raw <{{name}}>: compose Cynosure components (Stack, Inline, Text, Heading, Button...). Only a drawing surface in src/shared/surfaces may use raw elements (redesign spec, rule 1).',
      className:
        'className: lay out and style with Cynosure components and their props, not classes (redesign spec, rule 1).',
      style:
        'style props live only in src/shared/surfaces (redesign spec, rule 1).',
      dom: 'document.createElement("{{name}}") outside src/shared/surfaces (redesign spec, rule 1).',
      imperative:
        'Inline styles written imperatively ({{how}}) live only in src/shared/surfaces (redesign spec, rule 1).',
    },
    schema: [],
  },
  create(context) {
    if (exempt(context.filename)) return {};
    // Cynosure components take `style` for layout only (their documented
    // contract: a height for a viewport or a list); everything else is
    // restyled through tokens. Only those imports may carry it.
    /** @type {Set<string>} */
    const cynosure = new Set();
    return {
      /** @param {any} node */
      ImportDeclaration(node) {
        if (node.source.value !== '@arshad-shah/cynosure') return;
        for (const s of node.specifiers)
          if (s.type === 'ImportSpecifier') cynosure.add(s.local.name);
      },
      /** @param {any} node */
      JSXOpeningElement(node) {
        const n = node.name;
        if (n.type === 'JSXIdentifier' && /^[a-z]/.test(n.name))
          context.report({
            node,
            messageId: 'element',
            data: { name: n.name },
          });
        const layoutStyle = n.type === 'JSXIdentifier' && cynosure.has(n.name);
        for (const attr of node.attributes) {
          if (
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'className'
          )
            context.report({ node: attr, messageId: 'className' });
          // A Cynosure component's `style` is layout (its contract).
          if (layoutStyle) continue;
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
        if (!tag || !DOM_BANNED.has(tag)) return;
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
