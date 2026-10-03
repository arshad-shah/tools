import { Inline, SegmentedControl, Select, Text } from '@/shared/ui';
import type { CvdMode } from '../lib/harmonies';

const OPTIONS: { value: CvdMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'protan', label: 'Protan' },
  { value: 'deutan', label: 'Deutan' },
  { value: 'tritan', label: 'Tritan' },
  { value: 'achroma', label: 'Achroma' },
];

/**
 * Simulated colour vision for the previews, palette and contrast pair: a
 * segmented switch from sm up, a compact select on phones so the header's
 * Share stays in view.
 */
export function CvdToggle({
  value,
  onChange,
}: {
  value: CvdMode;
  onChange(v: CvdMode): void;
}) {
  return (
    <>
      <Inline
        gap="2"
        align="center"
        wrap={false}
        className="hidden min-w-0 max-w-full sm:flex"
      >
        <Text as="span" size="sm" tone="muted" aria-hidden>
          Vision
        </Text>
        <SegmentedControl
          label="Simulate colour vision"
          size="sm"
          className="min-w-0"
          value={value}
          onChange={onChange}
          options={OPTIONS}
        />
      </Inline>
      <div className="w-40 sm:hidden">
        <Select
          aria-label="Simulate colour vision"
          size="sm"
          value={value}
          onValueChange={(v) => onChange(v as CvdMode)}
          items={OPTIONS.map((o) => ({
            value: o.value,
            label: o.value === 'none' ? 'Vision: normal' : `Vision: ${o.label}`,
          }))}
        />
      </div>
    </>
  );
}
