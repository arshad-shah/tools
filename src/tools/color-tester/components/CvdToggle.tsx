import { Select } from '@arshad-shah/cynosure';
import type { CvdMode } from '../lib/harmonies';

const OPTIONS: { value: CvdMode; label: string }[] = [
  { value: 'none', label: 'Normal vision' },
  { value: 'protan', label: 'Protan' },
  { value: 'deutan', label: 'Deutan' },
  { value: 'tritan', label: 'Tritan' },
  { value: 'achroma', label: 'Achroma' },
];

/**
 * Simulated colour vision for the previews, palette and contrast pair: one
 * compact select in the page header, at every width.
 */
export function CvdToggle({
  value,
  onChange,
}: {
  value: CvdMode;
  onChange(v: CvdMode): void;
}) {
  return (
    <Select
      label="Simulate colour vision"
      labelHidden
      size="sm"
      value={value}
      onChange={(v) => onChange(v as CvdMode)}
      options={OPTIONS}
    />
  );
}
