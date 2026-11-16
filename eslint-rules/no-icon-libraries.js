// @ts-check
/**
 * Icon packages tools does not use: every icon is a Facet icon (tools#104).
 * A package name, or a scope ending in `/` for every package in it.
 */
const ICON_LIBRARIES = [
  'lucide-react',
  'lucide',
  'react-icons',
  'react-feather',
  '@heroicons/',
  '@tabler/',
  '@phosphor-icons/',
  '@radix-ui/react-icons',
  '@mui/icons-material',
  '@fortawesome/',
  '@iconify/',
];

/** @param {unknown} s */
const isIconLibrary = (s) =>
  typeof s === 'string' &&
  ICON_LIBRARIES.some((lib) =>
    lib.endsWith('/')
      ? s.startsWith(lib)
      : s === lib || s.startsWith(`${lib}/`),
  );

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Icons are Facet icons: no icon package (lucide-react and the like) anywhere (tools#104)',
    },
    messages: {
      library:
        'Icons are Facet icons: import them from @arshad-shah/cynosure/icons, never from an icon package (tools#104).',
    },
    schema: [],
  },
  create(context) {
    /** @param {import('estree').Node} node */
    const report = (node) => context.report({ node, messageId: 'library' });
    return {
      ImportDeclaration(n) {
        if (isIconLibrary(n.source.value)) report(n);
      },
      ExportNamedDeclaration(n) {
        if (n.source && isIconLibrary(n.source.value)) report(n);
      },
      ExportAllDeclaration(n) {
        if (isIconLibrary(n.source.value)) report(n);
      },
      ImportExpression(n) {
        if (n.source.type === 'Literal' && isIconLibrary(n.source.value))
          report(n);
        else if (
          n.source.type === 'TemplateLiteral' &&
          n.source.expressions.length === 0 &&
          isIconLibrary(n.source.quasis[0]?.value.cooked)
        )
          report(n);
      },
      CallExpression(n) {
        const arg = n.arguments[0];
        if (
          n.callee.type === 'Identifier' &&
          n.callee.name === 'require' &&
          arg?.type === 'Literal' &&
          isIconLibrary(arg.value)
        )
          report(n);
      },
      /** @param {any} n TS `typeof import('lucide-react')` */
      TSImportType(n) {
        const arg = n.argument?.literal ?? n.argument;
        if (arg && isIconLibrary(arg.value)) report(n);
      },
    };
  },
};
