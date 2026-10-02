import type { MockFieldType } from '@/shared/lib/data-formats/mock-schema';

/** Editor labels and help text, grouped for the type picker. */
export const FIELD_TYPE_INFO: Record<
  MockFieldType,
  { label: string; description: string; group: string }
> = {
  object: {
    label: 'Object',
    description: 'Nested object with its own fields',
    group: 'Structure',
  },
  array: { label: 'Array', description: 'List of items', group: 'Structure' },
  string: {
    label: 'String',
    description: 'Random lower-case letters (min and max set the length)',
    group: 'Basic',
  },
  int: {
    label: 'Integer',
    description: 'Whole number from min to max',
    group: 'Basic',
  },
  number: {
    label: 'Number',
    description: 'Number from min to max (decimals with precision)',
    group: 'Basic',
  },
  float: {
    label: 'Decimal',
    description: 'Decimal number from min to max',
    group: 'Basic',
  },
  boolean: { label: 'Boolean', description: 'true or false', group: 'Basic' },
  enum: {
    label: 'One of (weighted)',
    description: 'Picks one of your values by weight',
    group: 'Basic',
  },
  pattern: {
    label: 'Pattern',
    description: 'Text matching a regular expression',
    group: 'Basic',
  },
  uuid: { label: 'UUID', description: 'Version 4 UUID', group: 'Identifiers' },
  nanoid: {
    label: 'NanoID',
    description: 'URL-safe 21-character id',
    group: 'Identifiers',
  },
  sequence: {
    label: 'Sequence',
    description: 'Counts up from min (default 1)',
    group: 'Identifiers',
  },
  'foreign-key': {
    label: 'Reference',
    description: 'A value from another table',
    group: 'Identifiers',
  },
  firstName: {
    label: 'First name',
    description: 'Given name for the locale',
    group: 'People',
  },
  lastName: {
    label: 'Last name',
    description: 'Family name for the locale',
    group: 'People',
  },
  fullName: {
    label: 'Full name',
    description: 'First and last name',
    group: 'People',
  },
  username: { label: 'Username', description: 'Login name', group: 'People' },
  email: {
    label: 'Email',
    description: 'Email address on a reserved test domain',
    group: 'People',
  },
  phone: {
    label: 'Phone',
    description: 'Phone number in the locale format',
    group: 'People',
  },
  gender: { label: 'Gender', description: 'Gender category', group: 'People' },
  sex: { label: 'Sex', description: 'Sex category', group: 'People' },
  age: {
    label: 'Age',
    description: 'Age in years (18 to 90 unless set)',
    group: 'People',
  },
  jobTitle: { label: 'Job title', description: 'Job title', group: 'People' },
  company: { label: 'Company', description: 'Company name', group: 'People' },
  avatar: {
    label: 'Avatar',
    description: 'Identicon image as an SVG data URI (made locally)',
    group: 'People',
  },
  password: {
    label: 'Password',
    description: 'Random password (test data only)',
    group: 'People',
  },
  address: {
    label: 'Address',
    description: 'Street, postcode and city',
    group: 'Places',
  },
  street: {
    label: 'Street',
    description: 'Street and house number',
    group: 'Places',
  },
  city: { label: 'City', description: 'City for the locale', group: 'Places' },
  zipCode: {
    label: 'Postcode',
    description: 'Postcode in the locale format',
    group: 'Places',
  },
  country: { label: 'Country', description: 'Country name', group: 'Places' },
  countryCode: {
    label: 'Country code',
    description: 'ISO 3166 two-letter code',
    group: 'Places',
  },
  latitude: {
    label: 'Latitude',
    description: 'Latitude, 6 decimals',
    group: 'Places',
  },
  longitude: {
    label: 'Longitude',
    description: 'Longitude, 6 decimals',
    group: 'Places',
  },
  date: { label: 'Date', description: 'Date as YYYY-MM-DD', group: 'Time' },
  dateTime: {
    label: 'Date and time',
    description: 'ISO 8601 date and time (UTC)',
    group: 'Time',
  },
  time: {
    label: 'Time',
    description: 'Time of day as HH:MM:SS',
    group: 'Time',
  },
  timestamp: {
    label: 'Unix timestamp',
    description: 'Seconds since 1970',
    group: 'Time',
  },
  creditCard: {
    label: 'Card number',
    description: 'Luhn-valid test card number',
    group: 'Money',
  },
  iban: {
    label: 'IBAN',
    description: 'IBAN with valid check digits',
    group: 'Money',
  },
  currency: {
    label: 'Amount',
    description: 'Amount as text with 2 decimals',
    group: 'Money',
  },
  currencyCode: {
    label: 'Currency code',
    description: 'ISO 4217 code',
    group: 'Money',
  },
  price: { label: 'Price', description: 'Price as a number', group: 'Money' },
  url: { label: 'URL', description: 'Web address', group: 'Network' },
  domain: { label: 'Domain', description: 'Domain name', group: 'Network' },
  ipAddress: {
    label: 'IPv4 address',
    description: 'IPv4 address',
    group: 'Network',
  },
  ipv6: {
    label: 'IPv6 address',
    description: 'IPv6 address',
    group: 'Network',
  },
  mac: {
    label: 'MAC address',
    description: 'Locally administered MAC address',
    group: 'Network',
  },
  word: { label: 'Word', description: 'One lorem ipsum word', group: 'Text' },
  words: {
    label: 'Words',
    description: 'Several lorem ipsum words',
    group: 'Text',
  },
  sentence: {
    label: 'Sentence',
    description: 'A lorem ipsum sentence',
    group: 'Text',
  },
  paragraph: {
    label: 'Paragraph',
    description: 'A lorem ipsum paragraph',
    group: 'Text',
  },
  slug: { label: 'Slug', description: 'URL slug', group: 'Text' },
  color: {
    label: 'Hex colour',
    description: 'Colour as #rrggbb',
    group: 'Other',
  },
  semver: { label: 'Version', description: 'Semantic version', group: 'Other' },
  cron: {
    label: 'Cron expression',
    description: 'Five-field cron expression',
    group: 'Other',
  },
  productName: {
    label: 'Product name',
    description: 'Product name',
    group: 'Other',
  },
};
