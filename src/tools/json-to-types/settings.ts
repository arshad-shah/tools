import { createToolSettings } from '@/shared/lib/tool-settings';
import {
  DEFAULT_GENERATE,
  isTargetId,
  type GenerateOptions,
} from './lib/generate';

/** Options only, never the JSON or the generated code. */
export interface JsonToTypesSettings {
  target: string;
  rootName: string;
  detectDates: boolean;
  arrayAsSamples: boolean;
  tsDeclaration: string;
  pythonStyle: string;
}

export const JSON_TO_TYPES_DEFAULTS: JsonToTypesSettings = {
  target: DEFAULT_GENERATE.target,
  rootName: DEFAULT_GENERATE.rootName,
  detectDates: DEFAULT_GENERATE.detectDates,
  arrayAsSamples: DEFAULT_GENERATE.arrayAsSamples,
  tsDeclaration: DEFAULT_GENERATE.tsDeclaration,
  pythonStyle: DEFAULT_GENERATE.pythonStyle,
};

export const jsonToTypesSettings = createToolSettings(
  'json-to-types',
  JSON_TO_TYPES_DEFAULTS,
  { version: 1 },
);

/** Stored settings as generator options, unknown values replaced by defaults. */
export function readOptions(s: JsonToTypesSettings): GenerateOptions {
  return {
    target: isTargetId(s.target) ? s.target : DEFAULT_GENERATE.target,
    rootName: s.rootName.slice(0, 80),
    detectDates: s.detectDates,
    arrayAsSamples: s.arrayAsSamples,
    tsDeclaration: s.tsDeclaration === 'type' ? 'type' : 'interface',
    pythonStyle: s.pythonStyle === 'typeddict' ? 'typeddict' : 'dataclass',
  };
}
