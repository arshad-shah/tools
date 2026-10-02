import { COIN_LABELS, type PayloadType } from './payloads';

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'password'
  | 'select'
  | 'switch'
  | 'datetime';

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: { value: string; label: string }[];
  inputMode?: 'text' | 'tel' | 'email' | 'url' | 'decimal';
}

const t = (
  key: string,
  label: string,
  placeholder?: string,
  inputMode?: FieldSpec['inputMode'],
): FieldSpec => ({ key, label, kind: 'text', placeholder, inputMode });

/** The form for each payload type, in display order. */
export const FORM_SPECS: Record<PayloadType, FieldSpec[]> = {
  url: [t('url', 'URL', 'https://example.com', 'url')],
  text: [{ key: 'text', label: 'Text', kind: 'textarea' }],
  wifi: [
    t('ssid', 'Network name (SSID)'),
    {
      key: 'security',
      label: 'Security',
      kind: 'select',
      options: [
        { value: 'WPA', label: 'WPA or WPA2' },
        { value: 'WPA3', label: 'WPA3' },
        { value: 'WEP', label: 'WEP (legacy)' },
        { value: 'nopass', label: 'None (open network)' },
      ],
    },
    { key: 'password', label: 'Password', kind: 'password' },
    { key: 'hidden', label: 'Hidden network', kind: 'switch' },
  ],
  vcard: [
    t('firstName', 'First name'),
    t('lastName', 'Last name'),
    t('org', 'Organisation'),
    t('title', 'Job title'),
    t('phone', 'Work phone', '+44 20 7946 0000', 'tel'),
    t('mobile', 'Mobile', '', 'tel'),
    t('email', 'Email', 'name@example.com', 'email'),
    t('url', 'Website', 'https://', 'url'),
    t('street', 'Street'),
    t('city', 'City'),
    t('region', 'Region'),
    t('postcode', 'Postcode'),
    t('country', 'Country'),
    { key: 'note', label: 'Note', kind: 'textarea' },
  ],
  mecard: [
    t('firstName', 'First name'),
    t('lastName', 'Last name'),
    t('phone', 'Phone', '', 'tel'),
    t('email', 'Email', '', 'email'),
    t('url', 'Website', 'https://', 'url'),
    t('address', 'Address'),
    { key: 'note', label: 'Note', kind: 'textarea' },
  ],
  email: [
    t('to', 'To', 'name@example.com', 'email'),
    t('subject', 'Subject'),
    { key: 'body', label: 'Body', kind: 'textarea' },
  ],
  sms: [
    t('phone', 'Phone number', '+44 7700 900000', 'tel'),
    { key: 'message', label: 'Message', kind: 'textarea' },
  ],
  tel: [t('phone', 'Phone number', '+44 20 7946 0000', 'tel')],
  geo: [
    t('lat', 'Latitude', '51.5007', 'decimal'),
    t('lon', 'Longitude', '-0.1246', 'decimal'),
    t('label', 'Label (optional)'),
  ],
  event: [
    t('title', 'Title'),
    { key: 'start', label: 'Starts', kind: 'datetime' },
    { key: 'end', label: 'Ends', kind: 'datetime' },
    t('location', 'Location'),
    { key: 'description', label: 'Description', kind: 'textarea' },
  ],
  crypto: [
    {
      key: 'coin',
      label: 'Currency',
      kind: 'select',
      options: Object.entries(COIN_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    t('address', 'Wallet address'),
    t('amount', 'Amount (optional)', '0.01', 'decimal'),
    t('label', 'Label (optional)'),
    t('message', 'Message (optional)'),
    t('chainId', 'Chain id (Ethereum)', '1', 'decimal'),
  ],
  app: [
    {
      key: 'store',
      label: 'Store',
      kind: 'select',
      options: [
        { value: 'apple', label: 'Apple App Store' },
        { value: 'google', label: 'Google Play' },
      ],
    },
    t('appId', 'App id (Apple number or Android package)', 'com.example.app'),
  ],
};
