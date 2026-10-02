import type { Metadata } from './read';

export interface Risk {
  level: 'none' | 'low' | 'high';
  reasons: string[];
}

const SERIAL = /SerialNumber$/;
const OWNER =
  /^(OwnerName|CameraOwnerName|Artist|Author|Creator|By-line|Copyright)$/i;

/**
 * The privacy summary: a GPS position is high risk; serial numbers and owner
 * names are low risk (they link photos to a device or a person).
 */
export function assessRisk(meta: Metadata): Risk {
  const reasons: string[] = [];
  if (meta.gps)
    reasons.push(
      `GPS location (${meta.gps.lat.toFixed(4)}, ${meta.gps.lon.toFixed(4)})`,
    );
  else if (meta.groups.gps.length > 0) reasons.push('GPS data');
  const all = Object.values(meta.groups).flat();
  if (all.some(([k]) => SERIAL.test(k))) reasons.push('Device serial number');
  const owner = all.find(([k]) => OWNER.test(k));
  if (owner) reasons.push(`Owner name (${owner[1]})`);
  const level =
    meta.gps || meta.groups.gps.length > 0
      ? 'high'
      : reasons.length > 0
        ? 'low'
        : 'none';
  return { level, reasons };
}
