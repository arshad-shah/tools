import { syslogLevel } from '../level';
import type { FormatSpec } from '../model';
import { toEpoch } from '../time';

const RFC5424 =
  /^<(\d{1,3})>1 (\S+) (\S+) (\S+) (\S+) (\S+) (-|(?:\[(?:[^\]\\]|\\.)*\])+)(?: (.*))?$/;
const RFC3164 =
  /^(?:<(\d{1,3})>)?([A-Z][a-z]{2} [ \d]\d \d{2}:\d{2}:\d{2}) (\S+) ([^:[\s]+)(?:\[(\d+)\])?: ?(.*)$/;

const nil = (v: string) => (v === '-' ? undefined : v);

/** syslog RFC 5424 and RFC 3164 (BSD). */
export const syslog: FormatSpec = {
  id: 'syslog',
  label: 'syslog',
  parse(line) {
    let m = RFC5424.exec(line);
    if (m) {
      const [, pri, time, host, app, procid, msgid, sd, msg = ''] = m;
      const fields: Record<string, string> = {
        facility: String(Number(pri) >> 3),
      };
      if (nil(host)) fields.host = host;
      if (nil(procid)) fields.pid = procid;
      if (nil(msgid)) fields.msgid = msgid;
      if (sd !== '-') fields.data = sd;
      return {
        ts: nil(time) ? toEpoch(time) : undefined,
        level: syslogLevel(Number(pri) & 7),
        component: nil(app),
        message: msg.replace(/^\uFEFF/, ''),
        fields,
      };
    }
    m = RFC3164.exec(line);
    if (m) {
      const [, pri, time, host, tag, pid, msg] = m;
      const fields: Record<string, string> = { host, time };
      if (pid) fields.pid = pid;
      return {
        level: pri === undefined ? undefined : syslogLevel(Number(pri) & 7),
        component: tag,
        message: msg,
        fields,
      };
    }
    return null;
  },
};
