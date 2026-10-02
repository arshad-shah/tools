import { query } from './escape';

export interface EmailFields {
  to: string;
  subject: string;
  body: string;
}

export const emailPayload = (f: EmailFields) =>
  `mailto:${f.to.trim()}${query([
    ['subject', f.subject],
    ['body', f.body],
  ])}`;
