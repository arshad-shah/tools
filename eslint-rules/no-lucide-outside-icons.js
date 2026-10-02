// @ts-check
/** @param {unknown} s */
const isLucide = (s) =>
  typeof s === 'string' &&
  (s === 'lucide-react' || s.startsWith('lucide-react/'));

/** @param {string} filename */
const inIconModule = (filename) =>
  /(^|[\\/])src[\\/]shared[\\/]ui[\\/]icons[\\/]/.test(filename);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'lucide-react is reachable only from src/shared/ui/icons (spec 1A R1)',
    },
    messages: {
      lucide:
        'Import icons from @/shared/ui/icons; lucide-react is reachable only from src/shared/ui/icons (spec 1A R1).',
    },
    schema: [],
  },
  create(context) {
    if (inIconModule(context.filename)) return {};
    /** @param {import('estree').Node} node */
    const report = (node) => context.report({ node, messageId: 'lucide' });
    return {
      ImportDeclaration(n) {
        if (isLucide(n.source.value)) report(n);
      },
      ExportNamedDeclaration(n) {
        if (n.source && isLucide(n.source.value)) report(n);
      },
      ExportAllDeclaration(n) {
        if (isLucide(n.source.value)) report(n);
      },
      ImportExpression(n) {
        if (n.source.type === 'Literal' && isLucide(n.source.value)) report(n);
        else if (
          n.source.type === 'TemplateLiteral' &&
          n.source.expressions.length === 0 &&
          isLucide(n.source.quasis[0]?.value.cooked)
        )
          report(n);
      },
      CallExpression(n) {
        const arg = n.arguments[0];
        if (
          n.callee.type === 'Identifier' &&
          n.callee.name === 'require' &&
          arg?.type === 'Literal' &&
          isLucide(arg.value)
        )
          report(n);
      },
      /** @param {any} n TS `typeof import('lucide-react')` */
      TSImportType(n) {
        const arg = n.argument?.literal ?? n.argument;
        if (arg && isLucide(arg.value)) report(n);
      },
    };
  },
};
