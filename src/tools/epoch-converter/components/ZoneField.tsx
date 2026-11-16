import { Combobox } from '@arshad-shah/cynosure';
import React, { useMemo } from 'react';
import { listZones } from '@/shared/lib/time';

/** Every IANA zone with its offset now: type a city or zone to find it. */
export const ZoneField: React.FC<{
  label: string;
  value: string;
  onChange(zone: string): void;
}> = ({ label, value, onChange }) => {
  const options = useMemo(
    () => listZones().map((z) => ({ value: z.id, label: z.label })),
    [],
  );
  return (
    <Combobox
      label={label}
      options={options}
      value={value}
      onChange={(zone) => {
        if (zone) onChange(zone);
      }}
    />
  );
};
