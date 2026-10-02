import type { RegexTemplate, TemplateCategory } from '../types';

const t = (
  category: TemplateCategory,
  name: string,
  pattern: string,
  flags: string,
  description: string,
  samples: string[],
): RegexTemplate => ({ category, name, pattern, flags, description, samples });

/** The searchable template library (spec §8.1, around 40 entries). */
export const TEMPLATES: RegexTemplate[] = [
  // Web
  t(
    'web',
    'Email Address',
    '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    'g',
    'Standard email address format',
    [
      'Contact us at info@example.com or support@company.org',
      'John Doe: john.doe123@gmail.com',
      'Invalid: not-an-email@',
    ],
  ),
  t(
    'web',
    'HTTP/HTTPS URL',
    'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)',
    'g',
    'Web URLs with HTTP or HTTPS protocol',
    [
      'Visit https://www.example.com or http://test.org',
      'Also check https://sub.domain.co.uk/path?param=value',
      'Invalid: not-a-url',
    ],
  ),
  t(
    'web',
    'IPv4 Address',
    '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b',
    'g',
    'IPv4 network address',
    ['192.168.1.1', '10.0.0.1 and 203.0.113.42', 'Invalid: 256.1.1.1'],
  ),
  t(
    'web',
    'IPv6 Address (full)',
    '\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b',
    'g',
    'IPv6 address in its uncompressed form',
    ['2001:0db8:85a3:0000:0000:8a2e:0370:7334', 'Invalid: 2001:db8::1'],
  ),
  t(
    'web',
    'Domain Name',
    '\\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,}\\b',
    'gi',
    'Host names such as example.co.uk',
    ['example.com', 'api.sub.example.co.uk', 'Invalid: -bad-.com'],
  ),
  t(
    'web',
    'URL Query Parameter',
    '[?&](?<key>[^=&#]+)=(?<value>[^&#]*)',
    'g',
    'Key and value pairs in a query string',
    ['https://example.com/search?q=regex&page=2&sort='],
  ),
  t(
    'web',
    'Slug',
    '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    'gm',
    'Lowercase URL slugs joined by hyphens',
    ['my-first-post', 'release-2024', 'Invalid--Slug'],
  ),
  t(
    'web',
    'HTML Tag',
    '<(?<tag>[a-zA-Z][\\w-]*)\\b[^>]*>',
    'g',
    'Opening HTML tags and their names',
    ['<div class="a"><span>text</span></div>', '<br/>'],
  ),
  t(
    'web',
    'MAC Address',
    '\\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\\b',
    'g',
    'Hardware addresses with colons or hyphens',
    ['00:1A:2B:3C:4D:5E', '00-1a-2b-3c-4d-5e', 'Invalid: 00:1A:2B'],
  ),
  t(
    'web',
    'Port Number',
    ':(?<port>6553[0-5]|655[0-2]\\d|65[0-4]\\d{2}|6[0-4]\\d{3}|[1-5]\\d{4}|[1-9]\\d{0,3})\\b',
    'g',
    'A port after a colon, 1 to 65535',
    ['localhost:8080', 'db.local:5432', 'Invalid: host:70000'],
  ),
  // Validation
  t(
    'validation',
    'Strong Password',
    '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    'gm',
    'Mixed case, numbers and special characters, at least 8',
    ['P@ssw0rd!2023', 'Weak: password123', '123'],
  ),
  t(
    'validation',
    'Credit Card Number',
    '^(?:4\\d{12}(?:\\d{3})?|5[1-5]\\d{14}|3[47]\\d{13}|3(?:0[0-5]|[68]\\d)\\d{11}|6(?:011|5\\d{2})\\d{12})$',
    'gm',
    'Major credit card number formats',
    ['4111111111111111', '5500000000000004', '1234'],
  ),
  t(
    'validation',
    'Username',
    '^[a-zA-Z][a-zA-Z0-9_]{2,15}$',
    'gm',
    'Starts with a letter, 3 to 16 letters, digits or underscores',
    ['alice_01', 'Bob', '1nvalid', 'x'],
  ),
  t(
    'validation',
    'US ZIP Code',
    '^\\d{5}(?:-\\d{4})?$',
    'gm',
    'Five digits with an optional plus-four',
    ['90210', '12345-6789', '1234'],
  ),
  t(
    'validation',
    'UK Postcode',
    '^[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}$',
    'gmi',
    'British postcodes such as SW1A 1AA',
    ['SW1A 1AA', 'M1 1AE', 'Invalid: 12345'],
  ),
  t(
    'validation',
    'IBAN',
    '\\b[A-Z]{2}\\d{2}[A-Z0-9]{11,30}\\b',
    'g',
    'International bank account numbers (shape only)',
    ['GB82WEST12345698765432', 'DE89370400440532013000', 'Invalid: GB82'],
  ),
  t(
    'validation',
    'Semantic Version',
    '\\bv?(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<pre>[\\da-z-]+(?:\\.[\\da-z-]+)*))?(?:\\+(?<build>[\\da-z-]+(?:\\.[\\da-z-]+)*))?\\b',
    'gi',
    'SemVer 2.0 versions with pre-release and build',
    ['1.2.3', 'v2.0.0-rc.1+build.5', 'Invalid: 1.2'],
  ),
  t(
    'validation',
    'Integer',
    '^[-+]?\\d+$',
    'gm',
    'A whole number with an optional sign',
    ['42', '-17', '3.14'],
  ),
  t(
    'validation',
    'Decimal Number',
    '^[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?$',
    'gm',
    'Decimal or scientific notation',
    ['3.14', '-0.5', '6.02e23', 'abc'],
  ),
  t(
    'validation',
    'Hex Number',
    '\\b0[xX][0-9a-fA-F]+\\b',
    'g',
    'Hexadecimal literals such as 0xFF',
    ['0xFF and 0x1a2b', 'Invalid: 0xZZ'],
  ),
  // Formats
  t(
    'format',
    'Date (ISO 8601)',
    '\\b(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])\\b',
    'g',
    'ISO date format (YYYY-MM-DD)',
    ['Meeting: 2023-05-15', 'Deadline: 2024-01-31', 'Invalid: 2023/05/15'],
  ),
  t(
    'format',
    'Date (DD/MM/YYYY)',
    '\\b(0[1-9]|[12]\\d|3[01])\\/(0[1-9]|1[0-2])\\/(\\d{4})\\b',
    'g',
    'Day, month and year with slashes',
    ['15/05/2023', '31/12/1999', 'Invalid: 32/13/2020'],
  ),
  t(
    'format',
    'Time (24-hour)',
    '\\b([01]?\\d|2[0-3]):[0-5]\\d\\b',
    'g',
    '24-hour time format (HH:MM)',
    ['Meeting at 09:30', 'Lunch break: 12:45', 'Invalid: 25:61'],
  ),
  t(
    'format',
    'Time (12-hour)',
    '\\b(0?[1-9]|1[0-2]):[0-5]\\d\\s?[AaPp][Mm]\\b',
    'g',
    '12-hour time with AM or PM',
    ['9:30 AM', '12:15pm', 'Invalid: 13:00 PM'],
  ),
  t(
    'format',
    'ISO 8601 Timestamp',
    '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})',
    'g',
    'Date and time with a zone',
    ['2024-03-01T12:00:00Z', '2024-03-01T12:00:00.123+02:00'],
  ),
  t(
    'format',
    'Hex Color Code',
    '#(?:[A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})\\b',
    'g',
    'Hexadecimal colour codes',
    ['#FF5733', '#abc', '#123456', 'Invalid: #zz5533'],
  ),
  t(
    'format',
    'RGB Color',
    'rgba?\\(\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})(?:\\s*,\\s*(0|1|0?\\.\\d+))?\\s*\\)',
    'g',
    'CSS rgb() and rgba() colours',
    ['rgb(255, 0, 0)', 'rgba(0,0,0,0.5)'],
  ),
  t(
    'format',
    'UUID',
    '\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b',
    'g',
    'Universally unique identifier',
    ['123e4567-e89b-12d3-a456-426614174000', 'Invalid: 123e4567'],
  ),
  t(
    'format',
    'Phone Number (E.164)',
    '\\+[1-9]\\d{1,14}\\b',
    'g',
    'International phone number format',
    ['+1234567890', '+44123456789', 'Invalid: 555-0123'],
  ),
  t(
    'format',
    'Currency Amount',
    '[$£€]\\s?\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?',
    'g',
    'Dollar, pound or euro amounts',
    ['Total: $1,234.56', 'Fee: $5'],
  ),
  t(
    'format',
    'Log Line',
    '^(?<ts>\\S+) (?<level>[A-Z]+) (?<msg>.*)$',
    'gm',
    'Timestamp, level and message, ready to use as a log format',
    [
      '2024-03-01T12:00:00Z INFO Server started',
      '2024-03-01T12:00:01Z ERROR Connection refused',
    ],
  ),
  // Common
  t(
    'common',
    'Whitespace Run',
    '\\s{2,}',
    'g',
    'Two or more whitespace characters',
    ['too   many    spaces'],
  ),
  t(
    'common',
    'Trailing Whitespace',
    '[ \\t]+$',
    'gm',
    'Spaces or tabs at the end of a line',
    ['line with trailing   ', 'clean line'],
  ),
  t('common', 'Blank Line', '^\\s*$', 'gm', 'Empty or whitespace-only lines', [
    'first',
    '',
    'third',
  ]),
  t(
    'common',
    'Duplicate Word',
    '\\b(\\w+)\\s+\\1\\b',
    'gi',
    'A word repeated twice in a row',
    ['This is is a test', 'the the end'],
  ),
  t(
    'common',
    'Quoted String',
    '"(?:[^"\\\\]|\\\\.)*"',
    'g',
    'Double-quoted strings with escapes',
    ['say "hello" and "a \\"quoted\\" word"'],
  ),
  t(
    'common',
    'Hashtag',
    '(?<=^|\\s)#(?<tag>[\\p{L}\\p{N}_]+)',
    'gu',
    'Hashtags in social posts',
    ['Loving #regex and #JavaScript today'],
  ),
  t(
    'common',
    'Mention',
    '(?<=^|\\s)@(?<user>[A-Za-z0-9_]{1,15})\\b',
    'g',
    'Mentions such as @someone',
    ['Thanks @alice and @bob_42', 'email@example.com'],
  ),
  t(
    'common',
    'Markdown Link',
    '\\[(?<text>[^\\]]+)\\]\\((?<url>[^)\\s]+)\\)',
    'g',
    'Inline Markdown links',
    ['See [the docs](https://example.com/docs) for more'],
  ),
  t(
    'common',
    'Key = Value',
    '^\\s*(?<key>[\\w.-]+)\\s*=\\s*(?<value>.*?)\\s*$',
    'gm',
    'INI and env style assignments',
    ['name = demo', 'PORT=8080', '# comment'],
  ),
];

export const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  web: 'Web and URLs',
  validation: 'Validation',
  format: 'Formats',
  common: 'Common patterns',
};

/** TEMPLATES by category, in CATEGORY_LABEL order. */
export function groupTemplates(): Record<TemplateCategory, RegexTemplate[]> {
  const groups: Record<TemplateCategory, RegexTemplate[]> = {
    web: [],
    validation: [],
    format: [],
    common: [],
  };
  TEMPLATES.forEach((x) => groups[x.category].push(x));
  return groups;
}

export const findTemplate = (name: string): RegexTemplate | undefined =>
  TEMPLATES.find((x) => x.name === name);

/** Case-insensitive search over name, description and pattern. */
export function searchTemplates(query: string): RegexTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return TEMPLATES;
  return TEMPLATES.filter((x) =>
    `${x.name} ${x.description} ${x.pattern}`.toLowerCase().includes(q),
  );
}

const GENERIC_SAMPLE =
  'Lorem ipsum dolor sit amet.\nNumbers: 123, 456\nEmail: user@example.com\nPhone: +1234567890\nDate: 2023-05-15\nURL: https://example.com';

/** Sample test text for a template (its samples, one per line). */
export function sampleTextFor(templateName: string): string {
  return findTemplate(templateName)?.samples.join('\n') ?? GENERIC_SAMPLE;
}
