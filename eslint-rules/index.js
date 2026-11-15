// @ts-check
import noDisableEnforced from './no-disable-enforced.js';
import noIconLibraries from './no-icon-libraries.js';
import noPictographicText from './no-pictographic-text.js';
import noRawUiOutsideKit from './no-raw-ui-outside-kit.js';

/** Rules that may never be disabled inline (spec 1A R4). */
export const ENFORCED_RULES = [
  'local/no-pictographic-text',
  'local/no-raw-ui-outside-kit',
  'local/no-icon-libraries',
  'local/no-disable-enforced',
];

export default {
  meta: { name: 'local', version: '1.0.0' },
  rules: {
    'no-pictographic-text': noPictographicText,
    'no-raw-ui-outside-kit': noRawUiOutsideKit,
    'no-icon-libraries': noIconLibraries,
    'no-disable-enforced': noDisableEnforced,
  },
};
