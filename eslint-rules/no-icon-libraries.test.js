import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';
import rule from './no-icon-libraries.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const bad = [{ messageId: 'library' }];

tester.run('no-icon-libraries', rule, {
  valid: [
    { code: `import { IconStar } from '@/shared/ui/icons';` },
    { code: `import { star } from '@arshad-shah/cynosure/icons';` },
    { code: `import { github } from '@arshad-shah/cynosure/brands';` },
    { code: `import x from 'lucide-reactor';` },
    { code: `import x from 'react-iconsole';` },
    { code: `import x from '@tabler-ish/core';` },
  ],
  invalid: [
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'src/tools/x/Tool.tsx',
      errors: bad,
    },
    {
      // The icon module too: it wraps Facet, nothing else.
      code: `import { Star } from 'lucide-react';`,
      filename: 'src/shared/ui/icons/facet.ts',
      errors: bad,
    },
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'C:\\repo\\src\\shared\\ui\\icons\\facet.ts',
      errors: bad,
    },
    {
      code: `import x from 'lucide';`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `import { FaStar } from 'react-icons/fa';`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `import { StarIcon } from '@heroicons/react/24/outline';`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `import { IconStar } from '@tabler/icons-react';`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `import type { LucideIcon } from 'lucide-react';`,
      filename: 'src/app/tool.ts',
      errors: bad,
    },
    {
      code: `import Icon from 'lucide-react/dist/esm/icons/x';`,
      filename: 'src/app/App.tsx',
      errors: bad,
    },
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'src/shared/ui/iconsish/x.ts',
      errors: bad,
    },
    {
      code: `export { Star } from 'lucide-react';`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `export * from 'lucide-react';`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `const m = import('lucide-react');`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: 'const m = import(`lucide-react/dist/esm/icons/x`);',
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `const m = require('lucide-react');`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
    {
      code: `type T = typeof import('lucide-react');`,
      filename: 'src/app/a.ts',
      errors: bad,
    },
  ],
});
