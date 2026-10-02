export type ScanKind =
  | 'url'
  | 'wifi'
  | 'vcard'
  | 'mecard'
  | 'email'
  | 'sms'
  | 'tel'
  | 'geo'
  | 'event'
  | 'crypto'
  | 'text';

export type ScanAction =
  | 'copy'
  | 'open'
  | 'url-inspector'
  | 'text-encoder'
  | 'vcf'
  | 'ics';

export interface Interpretation {
  kind: ScanKind;
  /** [label, value] pairs to show. */
  fields: [string, string][];
  actions: ScanAction[];
  /** A value the card masks until revealed (the WiFi password). */
  secret?: string;
}

export const KIND_LABELS: Record<ScanKind, string> = {
  url: 'Link',
  wifi: 'WiFi network',
  vcard: 'Contact (vCard)',
  mecard: 'Contact (MeCard)',
  email: 'Email',
  sms: 'Text message',
  tel: 'Phone number',
  geo: 'Location',
  event: 'Calendar event',
  crypto: 'Payment request',
  text: 'Text',
};

/**
 * `KEY:value;KEY:value;;` records (WiFi, MeCard, MATMSG) where `\` escapes
 * the next character, so `\;` is a literal semicolon.
 */
export function parseRecord(body: string): [string, string][] {
  const out: [string, string][] = [];
  let i = 0;
  while (i < body.length) {
    const colon = body.indexOf(':', i);
    if (colon < 0) break;
    const key = body.slice(i, colon).toUpperCase();
    let value = '';
    i = colon + 1;
    while (i < body.length && body[i] !== ';') {
      if (body[i] === '\\' && i + 1 < body.length) {
        value += body[i + 1];
        i += 2;
      } else value += body[i++];
    }
    i++; // the ';'
    if (key) out.push([key, value]);
    while (body[i] === ';') i++;
  }
  return out;
}

const get = (rec: [string, string][], key: string) =>
  rec.find(([k]) => k === key)?.[1];

/** vCard/iCalendar content lines: unfolded, with params split off. */
function contentLines(
  text: string,
): { name: string; params: string; value: string }[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
    .map((line) => {
      const colon = line.indexOf(':');
      if (colon < 0) return null;
      const head = line.slice(0, colon);
      const semi = head.indexOf(';');
      return {
        name: (semi < 0 ? head : head.slice(0, semi)).toUpperCase(),
        params: semi < 0 ? '' : head.slice(semi + 1),
        value: line.slice(colon + 1),
      };
    })
    .filter(
      (l): l is { name: string; params: string; value: string } => l !== null,
    );
}

const unescapeText = (v: string) =>
  v.replace(/\\([nN,;\\])/g, (_, c: string) =>
    c === 'n' || c === 'N' ? '\n' : c,
  );

function vcardFields(text: string): [string, string][] {
  const lines = contentLines(text);
  const fields: [string, string][] = [];
  const fn = lines.find((l) => l.name === 'FN')?.value;
  const n = lines.find((l) => l.name === 'N')?.value;
  const nameFromN = n
    ? n
        .split(';')
        .slice(0, 2)
        .reverse()
        .map(unescapeText)
        .filter(Boolean)
        .join(' ')
    : '';
  const name = fn ? unescapeText(fn) : nameFromN;
  if (name) fields.push(['Name', name]);
  const LABELS: Record<string, string> = {
    ORG: 'Organisation',
    TITLE: 'Job title',
    TEL: 'Phone',
    EMAIL: 'Email',
    URL: 'Website',
    ADR: 'Address',
    NOTE: 'Note',
    BDAY: 'Birthday',
  };
  for (const l of lines) {
    const label = LABELS[l.name];
    if (!label) continue;
    const value =
      l.name === 'ADR'
        ? l.value
            .split(';')
            .map(unescapeText)
            .filter((p) => p.trim())
            .join(', ')
        : l.name === 'ORG'
          ? l.value.split(';').map(unescapeText).filter(Boolean).join(', ')
          : unescapeText(l.value);
    if (value) fields.push([label, value]);
  }
  return fields;
}

function mecardFields(body: string): [string, string][] {
  const rec = parseRecord(body);
  const fields: [string, string][] = [];
  const n = get(rec, 'N');
  if (n) {
    const [last, first] = n.split(',');
    fields.push(['Name', [first, last].filter(Boolean).join(' ').trim()]);
  }
  const LABELS: Record<string, string> = {
    TEL: 'Phone',
    EMAIL: 'Email',
    URL: 'Website',
    ADR: 'Address',
    NOTE: 'Note',
    BDAY: 'Birthday',
    ORG: 'Organisation',
  };
  for (const [k, v] of rec) if (LABELS[k] && v) fields.push([LABELS[k], v]);
  return fields;
}

const vEscape = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/([,;])/g, '\\$1')
    .replace(/\n/g, '\\n');

/** A `.vcf` for a vCard or MeCard scan. */
export function vcfFor(text: string): string {
  if (/^BEGIN:VCARD/i.test(text.trim()))
    return text.trim().replace(/\r?\n/g, '\r\n') + '\r\n';
  const rec = parseRecord(text.replace(/^MECARD:/i, ''));
  const [last = '', first = ''] = (get(rec, 'N') ?? '').split(',');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vEscape(last)};${vEscape(first)};;;`,
    `FN:${vEscape([first, last].filter(Boolean).join(' '))}`,
  ];
  const MAP: Record<string, string> = {
    TEL: 'TEL',
    EMAIL: 'EMAIL',
    URL: 'URL',
    NOTE: 'NOTE',
    BDAY: 'BDAY',
    ORG: 'ORG',
  };
  for (const [k, v] of rec)
    if (MAP[k] && v) lines.push(`${MAP[k]}:${vEscape(v)}`);
  if (get(rec, 'ADR'))
    lines.push(`ADR:;;${vEscape(get(rec, 'ADR') ?? '')};;;;`);
  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}

/** `20261002T090000Z` as `2026-10-02 09:00 UTC`; other forms as given. */
export function formatIcalDate(v: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(
    v.trim(),
  );
  if (!m) return v;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  if (!m[4]) return date;
  return `${date} ${m[4]}:${m[5]}${m[7] ? ' UTC' : ''}`;
}

function eventFields(text: string): [string, string][] {
  const lines = contentLines(text);
  const fields: [string, string][] = [];
  const pick = (name: string, label: string, date = false) => {
    const l = lines.find((x) => x.name === name);
    if (l?.value)
      fields.push([
        label,
        date ? formatIcalDate(l.value) : unescapeText(l.value),
      ]);
  };
  pick('SUMMARY', 'Title');
  pick('DTSTART', 'Starts', true);
  pick('DTEND', 'Ends', true);
  pick('LOCATION', 'Location');
  pick('DESCRIPTION', 'Description');
  return fields;
}

/** A `.ics` calendar for an event scan. */
export function icsFor(text: string): string {
  const body = text.trim().replace(/\r?\n/g, '\r\n');
  if (/^BEGIN:VCALENDAR/i.test(body)) return body + '\r\n';
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//tools//QR Scanner//EN',
      body,
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'
  );
}

const COINS: Record<string, string> = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  litecoin: 'Litecoin',
  dogecoin: 'Dogecoin',
  bitcoincash: 'Bitcoin Cash',
};

function cryptoFields(text: string): [string, string][] | null {
  const m = /^([a-z]+):([^?]*)(?:\?(.*))?$/i.exec(text);
  if (!m || !COINS[m[1].toLowerCase()]) return null;
  const scheme = m[1].toLowerCase();
  const fields: [string, string][] = [['Currency', COINS[scheme]]];
  let target = decodeURIComponent(m[2]);
  if (scheme === 'ethereum') {
    target = target.replace(/^pay-/, '');
    const at = /^([^@/]+)(?:@(\d+))?(?:\/(.+))?$/.exec(target);
    if (at) {
      fields.push(['Address', at[1]]);
      if (at[2]) fields.push(['Chain id', at[2]]);
      if (at[3]) fields.push(['Function', at[3]]);
    } else fields.push(['Address', target]);
  } else fields.push(['Address', target]);
  const q = new URLSearchParams(m[3] ?? '');
  const LABELS: Record<string, string> = {
    amount: 'Amount',
    value: 'Value (wei)',
    label: 'Label',
    message: 'Message',
  };
  for (const [k, v] of q) fields.push([LABELS[k] ?? k, v]);
  return fields;
}

const BASIC: ScanAction[] = ['copy', 'text-encoder'];

/** What a scanned text is, its fields, and the actions that fit it. */
export function interpret(raw: string): Interpretation {
  const text = raw.trim();
  const upper = text.toUpperCase();

  if (upper.startsWith('WIFI:')) {
    const rec = parseRecord(text.slice(5));
    const fields: [string, string][] = [];
    const ssid = get(rec, 'S');
    if (ssid !== undefined) fields.push(['Network name', ssid]);
    fields.push(['Security', get(rec, 'T') || 'nopass']);
    const pass = get(rec, 'P');
    if (pass) fields.push(['Password', pass]);
    if (get(rec, 'H')?.toLowerCase() === 'true') fields.push(['Hidden', 'Yes']);
    return {
      kind: 'wifi',
      fields,
      actions: ['copy'],
      ...(pass ? { secret: pass } : {}),
    };
  }
  if (upper.startsWith('BEGIN:VCARD'))
    return {
      kind: 'vcard',
      fields: vcardFields(text),
      actions: ['copy', 'vcf'],
    };
  if (upper.startsWith('MECARD:'))
    return {
      kind: 'mecard',
      fields: mecardFields(text.slice(7)),
      actions: ['copy', 'vcf'],
    };
  if (
    upper.startsWith('BEGIN:VEVENT') ||
    (upper.startsWith('BEGIN:VCALENDAR') && upper.includes('BEGIN:VEVENT'))
  )
    return {
      kind: 'event',
      fields: eventFields(text),
      actions: ['copy', 'ics'],
    };
  if (upper.startsWith('MATMSG:')) {
    const rec = parseRecord(text.slice(7));
    const fields: [string, string][] = [];
    for (const [k, label] of [
      ['TO', 'To'],
      ['SUB', 'Subject'],
      ['BODY', 'Body'],
    ] as const) {
      const v = get(rec, k);
      if (v) fields.push([label, v]);
    }
    return { kind: 'email', fields, actions: BASIC };
  }
  if (/^mailto:/i.test(text)) {
    const [addr, query = ''] = text.slice(7).split(/\?(.*)/s);
    const q = new URLSearchParams(query);
    const fields: [string, string][] = [['To', decodeURIComponent(addr)]];
    if (q.get('subject')) fields.push(['Subject', q.get('subject') ?? '']);
    if (q.get('body')) fields.push(['Body', q.get('body') ?? '']);
    return { kind: 'email', fields, actions: ['copy', 'open'] };
  }
  if (/^smsto:/i.test(text)) {
    const [num, ...msg] = text.slice(6).split(':');
    const fields: [string, string][] = [['Number', num]];
    if (msg.length) fields.push(['Message', msg.join(':')]);
    return { kind: 'sms', fields, actions: ['copy', 'open'] };
  }
  if (/^sms:/i.test(text)) {
    const [num, query = ''] = text.slice(4).split(/\?(.*)/s);
    const fields: [string, string][] = [['Number', decodeURIComponent(num)]];
    const body = new URLSearchParams(query).get('body');
    if (body) fields.push(['Message', body]);
    return { kind: 'sms', fields, actions: ['copy', 'open'] };
  }
  if (/^tel:/i.test(text))
    return {
      kind: 'tel',
      fields: [['Number', decodeURIComponent(text.slice(4))]],
      actions: ['copy', 'open'],
    };
  const geo = /^geo:(-?[\d.]+),(-?[\d.]+)(?:,(-?[\d.]+))?(?:[;?](.*))?$/i.exec(
    text,
  );
  if (geo) {
    const fields: [string, string][] = [
      ['Latitude', geo[1]],
      ['Longitude', geo[2]],
    ];
    if (geo[3]) fields.push(['Altitude', geo[3]]);
    const label = new URLSearchParams(geo[4] ?? '').get('q');
    if (label) fields.push(['Label', label]);
    return { kind: 'geo', fields, actions: ['copy'] };
  }
  const crypto = cryptoFields(text);
  if (crypto) return { kind: 'crypto', fields: crypto, actions: ['copy'] };
  if (/^https?:\/\/\S+$/i.test(text)) {
    try {
      const u = new URL(text);
      return {
        kind: 'url',
        fields: [
          ['URL', u.href],
          ['Host', u.hostname],
        ],
        actions: ['copy', 'open', 'url-inspector', 'text-encoder'],
      };
    } catch {
      // Not a URL after all: plain text below.
    }
  }
  return { kind: 'text', fields: [['Text', text]], actions: BASIC };
}
