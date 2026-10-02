// @ts-check
import noDisableEnforced from './no-disable-enforced.js';
import noLucideOutsideIcons from './no-lucide-outside-icons.js';
import noPictographicText from './no-pictographic-text.js';

/** Rules that may never be disabled inline (spec 1A R4). */
export const ENFORCED_RULES = [
  'local/no-pictographic-text',
  'local/no-raw-ui-outside-kit',
  'local/no-lucide-outside-icons',
  'local/no-disable-enforced',
];

export default {
  meta: { name: 'local', version: '1.0.0' },
  rules: {
    'no-pictographic-text': noPictographicText,
    'no-lucide-outside-icons': noLucideOutsideIcons,
    'no-disable-enforced': noDisableEnforced,
  },
};
