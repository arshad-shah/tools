import { Select } from '@arshad-shah/cynosure';
import React, { useMemo } from 'react';
import { listZones } from '@/shared/lib/time';

/** Every IANA zone with its offset now (type to jump in the list). */
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
    <Select label={label} options={options} value={value} onChange={onChange} />
  );
};
