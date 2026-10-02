import { useId } from 'react';
import { Label, Switch, Text } from '@/shared/ui';
import type { ExportOptions } from '@/pdf/doc/export-stages';
import type { DocumentApi } from '../types';

/** Export option: linearize (the linearize export stage reads `options.linearize`). */
export function LinearizeOption({
  options,
  set,
}: {
  doc: DocumentApi;
  options: ExportOptions;
  set(patch: Partial<ExportOptions>): void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>Optimise for fast web view</Label>
        <Text size="sm" tone="muted">
          Browsers can show the first page while the rest is still loading.
        </Text>
      </div>
      <Switch
        id={id}
        checked={options.linearize === true}
        onCheckedChange={(linearize) => set({ linearize })}
      />
    </div>
  );
}
