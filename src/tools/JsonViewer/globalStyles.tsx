import { TokenStyle } from '../../types/DataViewerTypes';

export const tokenStyles: Record<string, TokenStyle> = {
  number: { className: 'text-orange-600 dark:text-orange-400' },
  key: { className: 'text-indigo-600 dark:text-indigo-400 font-medium' },
  string: { className: 'text-emerald-600 dark:text-emerald-400' },
  boolean: {
    className: 'text-purple-600 dark:text-purple-400',
    test: /true|false/,
  },
  null: { className: 'text-gray-600 dark:text-gray-400', test: /null/ },
  tag: { className: 'text-blue-600 dark:text-blue-400' },
  attr: { className: 'text-purple-600 dark:text-purple-400' },
  value: { className: 'text-green-600 dark:text-green-400' },
};
