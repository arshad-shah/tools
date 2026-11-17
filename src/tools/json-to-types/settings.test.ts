import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { JSON_TO_TYPES_DEFAULTS, readOptions } from './settings';

describe('json-to-types settings', () => {
  it('hold options only, never the JSON or the output', () => {
    expect(() => assertNoDataFields(JSON_TO_TYPES_DEFAULTS)).not.toThrow();
  });

  it('read back as valid generator options', () => {
    expect(readOptions(JSON_TO_TYPES_DEFAULTS)).toEqual({
      target: 'typescript',
      rootName: 'Root',
      detectDates: true,
      arrayAsSamples: false,
      tsDeclaration: 'interface',
      pythonStyle: 'dataclass',
    });
  });

  it('replace unknown stored values with defaults', () => {
    const o = readOptions({
      ...JSON_TO_TYPES_DEFAULTS,
      target: 'cobol',
      tsDeclaration: 'class',
      pythonStyle: 'pydantic',
    });
    expect(o.target).toBe('typescript');
    expect(o.tsDeclaration).toBe('interface');
    expect(o.pythonStyle).toBe('dataclass');
    expect(
      readOptions({
        ...JSON_TO_TYPES_DEFAULTS,
        target: 'rust',
        pythonStyle: 'typeddict',
      }),
    ).toMatchObject({ target: 'rust', pythonStyle: 'typeddict' });
  });
});
