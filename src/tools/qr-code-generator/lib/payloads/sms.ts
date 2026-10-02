export interface SmsFields {
  phone: string;
  message: string;
}

const digits = (p: string) => p.replace(/[^\d+*#]/g, '');

export const smsPayload = (f: SmsFields) =>
  `SMSTO:${digits(f.phone)}:${f.message}`;

export interface TelFields {
  phone: string;
}

export const telPayload = (f: TelFields) => `tel:${digits(f.phone)}`;
