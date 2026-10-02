import { SegmentedControl } from '@/shared/ui';
import type { CvdMode } from '../lib/harmonies';

const OPTIONS: { value: CvdMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'protan', label: 'Protan' },
  { value: 'deutan', label: 'Deutan' },
  { value: 'tritan', label: 'Tritan' },
  { value: 'achroma', label: 'Achroma' },
];

/** Simulated colour vision for the previews, palette and contrast pair. */
export function CvdToggle({
  value,
  onChange,
}: {
  value: CvdMode;
  onChange(v: CvdMode): void;
}) {
  return (
    <SegmentedControl
      label="Simulate colour vision"
      size="sm"
      value={value}
      onChange={onChange}
      options={OPTIONS}
    />
  );
}
