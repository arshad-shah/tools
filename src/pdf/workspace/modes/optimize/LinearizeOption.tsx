import { Switch } from '@arshad-shah/cynosure';
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
  return (
    <Switch
      label="Optimise for fast web view"
      description="Browsers can show the first page while the rest is still loading."
      checked={options.linearize === true}
      onChange={(linearize) => set({ linearize })}
    />
  );
}
