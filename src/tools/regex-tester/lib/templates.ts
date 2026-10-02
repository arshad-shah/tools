import type { RegexTemplate, TemplateCategory } from '../types';

export const TEMPLATES: RegexTemplate[] = [
  {
    name: 'Email Address',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    description: 'Standard email address format',
    category: 'web',
  },
  {
    name: 'HTTP/HTTPS URL',
    pattern:
      'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)',
    description: 'Web URLs with HTTP or HTTPS protocol',
    category: 'web',
  },
  {
    name: 'IPv4 Address',
    pattern:
      '(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)',
    description: 'IPv4 network address',
    category: 'web',
  },
  {
    name: 'Strong Password',
    pattern:
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    description: 'Mixed case, numbers, and special chars (8+)',
    category: 'validation',
  },
  {
    name: 'Credit Card Number',
    pattern:
      '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})$',
    description: 'Major credit card number formats',
    category: 'validation',
  },
  {
    name: 'Phone Number (E.164)',
    pattern: '\\+?[1-9]\\d{1,14}',
    description: 'International phone number format',
    category: 'common',
  },
  {
    name: 'Date (ISO 8601)',
    pattern: '\\d{4}-\\d{2}-\\d{2}',
    description: 'ISO date format (YYYY-MM-DD)',
    category: 'format',
  },
  {
    name: 'Time (24-hour)',
    pattern: '([01]?[0-9]|2[0-3]):[0-5][0-9]',
    description: '24-hour time format (HH:MM)',
    category: 'format',
  },
  {
    name: 'Hex Color Code',
    pattern: '#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})',
    description: 'Hexadecimal color codes',
    category: 'format',
  },
  {
    name: 'UUID',
    pattern:
      '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
    description: 'Universally Unique Identifier',
    category: 'format',
  },
];

export const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  web: 'Web & URLs',
  validation: 'Validation',
  format: 'Formats',
  common: 'Common Patterns',
};

/** TEMPLATES by category, in CATEGORY_LABEL order. */
export function groupTemplates(): Record<TemplateCategory, RegexTemplate[]> {
  const groups: Record<TemplateCategory, RegexTemplate[]> = {
    web: [],
    validation: [],
    format: [],
    common: [],
  };
  TEMPLATES.forEach((t) => groups[t.category].push(t));
  return groups;
}

export const findTemplate = (name: string): RegexTemplate | undefined =>
  TEMPLATES.find((t) => t.name === name);

/** Sample test text for a template, picked by keywords in its name. */
export function sampleTextFor(templateName: string): string {
  const lower = templateName.toLowerCase();
  if (lower.includes('email')) {
    return 'Contact us at info@example.com or support@company.org\nJohn Doe: john.doe123@gmail.com\nInvalid: not-an-email@';
  } else if (lower.includes('url') || lower.includes('http')) {
    return 'Visit https://www.example.com or http://test.org\nAlso check https://sub.domain.co.uk/path?param=value\nInvalid: not-a-url';
  } else if (lower.includes('phone')) {
    return '+1234567890\n+44123456789\n555-0123\nInvalid: abc123';
  } else if (lower.includes('date')) {
    return 'Meeting: 2023-05-15\nDeadline: 2024-01-31\nInvalid: 2023/05/15';
  } else if (lower.includes('time')) {
    return 'Meeting at 09:30\nLunch break: 12:45\nInvalid: 25:61';
  } else if (lower.includes('ipv4')) {
    return '192.168.1.1\n10.0.0.1\n203.0.113.42\nInvalid: 256.1.1.1';
  } else if (lower.includes('password')) {
    return 'Weak: password123\nStrong: P@ssw0rd!2023\nVery weak: 123';
  } else if (lower.includes('hex')) {
    return '#FF5733\n#abc\n#123456\nInvalid: #zz5533';
  }
  return 'Lorem ipsum dolor sit amet.\nNumbers: 123, 456\nEmail: user@example.com\nPhone: +1234567890\nDate: 2023-05-15\nURL: https://example.com';
}
