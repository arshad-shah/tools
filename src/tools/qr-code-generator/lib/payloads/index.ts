import { appPayload, type AppFields } from './app';
import { cryptoPayload, type CryptoFields } from './crypto';
import { emailPayload, type EmailFields } from './email';
import { eventPayload, type EventFields } from './event';
import { geoPayload, type GeoFields } from './geo';
import { mecardPayload, type MecardFields } from './mecard';
import { smsPayload, telPayload, type SmsFields, type TelFields } from './sms';
import {
  textPayload,
  urlPayload,
  type TextFields,
  type UrlFields,
} from './url';
import { vcardPayload, type VcardFields } from './vcard';
import { wifiPayload, type WifiFields } from './wifi';

export interface PayloadFields {
  url: UrlFields;
  text: TextFields;
  wifi: WifiFields;
  vcard: VcardFields;
  mecard: MecardFields;
  email: EmailFields;
  sms: SmsFields;
  tel: TelFields;
  geo: GeoFields;
  event: EventFields;
  crypto: CryptoFields;
  app: AppFields;
}

export type PayloadType = keyof PayloadFields;

const BUILDERS: { [T in PayloadType]: (f: PayloadFields[T]) => string } = {
  url: urlPayload,
  text: textPayload,
  wifi: wifiPayload,
  vcard: vcardPayload,
  mecard: mecardPayload,
  email: emailPayload,
  sms: smsPayload,
  tel: telPayload,
  geo: geoPayload,
  event: eventPayload,
  crypto: cryptoPayload,
  app: appPayload,
};

/** The exact text the QR code encodes for `type`. */
export function buildPayload<T extends PayloadType>(
  type: T,
  fields: PayloadFields[T],
): string {
  return BUILDERS[type](fields);
}

export const PAYLOAD_LABELS: Record<PayloadType, string> = {
  url: 'Link',
  text: 'Text',
  wifi: 'WiFi',
  vcard: 'Contact (vCard)',
  mecard: 'Contact (MeCard)',
  email: 'Email',
  sms: 'SMS',
  tel: 'Phone',
  geo: 'Location',
  event: 'Calendar event',
  crypto: 'Crypto payment',
  app: 'App store',
};

/** Types whose fields hold a password: never shared as a link (spec §4.2). */
export const SECRET_TYPES: ReadonlySet<PayloadType> = new Set(['wifi']);

export const DEFAULT_FIELDS: PayloadFields = {
  url: { url: 'https://example.com' },
  text: { text: '' },
  wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
  vcard: {
    firstName: '',
    lastName: '',
    org: '',
    title: '',
    phone: '',
    mobile: '',
    email: '',
    url: '',
    street: '',
    city: '',
    region: '',
    postcode: '',
    country: '',
    note: '',
  },
  mecard: {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    url: '',
    address: '',
    note: '',
  },
  email: { to: '', subject: '', body: '' },
  sms: { phone: '', message: '' },
  tel: { phone: '' },
  geo: { lat: '', lon: '', label: '' },
  event: { title: '', start: '', end: '', location: '', description: '' },
  crypto: {
    coin: 'BTC',
    address: '',
    amount: '',
    label: '',
    message: '',
    chainId: '1',
  },
  app: { store: 'apple', appId: '' },
};

export type { WifiSecurity } from './wifi';
export { COIN_LABELS, COIN_SCHEMES, etherToWei, type Coin } from './crypto';
export { geoProblem } from './geo';
export { icalUtc } from './event';
