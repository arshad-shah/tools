import { escapeRecord } from './escape';

export type WifiSecurity = 'WPA' | 'WPA3' | 'WEP' | 'nopass';

export interface WifiFields {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

/**
 * `WIFI:T:WPA;S:<ssid>;P:<password>;H:true;;`. WPA3 is written as `T:WPA`
 * with the `R:1` hint (readers without WPA3 support still join WPA2/3
 * transition networks).
 */
export function wifiPayload(f: WifiFields): string {
  const parts = [`T:${f.security === 'WPA3' ? 'WPA' : f.security}`];
  if (f.security === 'WPA3') parts.push('R:1');
  parts.push(`S:${escapeRecord(f.ssid)}`);
  if (f.security !== 'nopass') parts.push(`P:${escapeRecord(f.password)}`);
  if (f.hidden) parts.push('H:true');
  return `WIFI:${parts.join(';')};;`;
}
