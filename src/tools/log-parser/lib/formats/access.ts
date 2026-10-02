import type { FormatSpec } from '../model';
import { toEpoch } from '../time';

const COMBINED =
  /^(\S+) (\S+) (\S+) \[([^\]]+)\] "(\S+) (\S+)(?: (\S+))?" (\d{3}) (\d+|-)(?: "([^"]*)" "([^"]*)")?/;

/** nginx and Apache common and combined access logs. */
export const access: FormatSpec = {
  id: 'access',
  label: 'Access log (nginx, Apache)',
  parse(line) {
    const m = COMBINED.exec(line);
    if (!m) return null;
    const [
      ,
      ip,
      ,
      user,
      time,
      method,
      path,
      protocol,
      status,
      bytes,
      referer,
      ua,
    ] = m;
    const code = Number(status);
    const fields: Record<string, string> = {
      ip,
      method,
      path,
      status,
      bytes: bytes === '-' ? '0' : bytes,
    };
    if (user !== '-') fields.user = user;
    if (protocol) fields.protocol = protocol;
    if (referer !== undefined && referer !== '-') fields.referer = referer;
    if (ua !== undefined) fields.ua = ua;
    return {
      ts: toEpoch(time),
      level: code >= 500 ? 'error' : code >= 400 ? 'warn' : 'info',
      message: `${method} ${path} ${status}`,
      fields,
    };
  },
};
