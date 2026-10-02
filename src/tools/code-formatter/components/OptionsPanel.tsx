import { useId } from 'react';
import { Inline, Label, NumberInput, Select, Switch } from '@/shared/ui';
import {
  SQL_DIALECT_LABEL,
  SQL_DIALECTS,
  type FormatLanguage,
  type FormatOptions,
} from '../lib/languages';

const JS_LIKE: readonly FormatLanguage[] = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
];

interface OptionsPanelProps {
  language: FormatLanguage;
  options: FormatOptions;
  onChange(patch: Partial<FormatOptions>): void;
  mangle: boolean;
  onMangleChange(mangle: boolean): void;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
}) {
  const id = useId();
  return (
    <Inline gap="2" align="center" wrap={false}>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </Inline>
  );
}

/** Options for the chosen language (Prettier subset, SQL, minifier). */
export function OptionsPanel({
  language,
  options,
  onChange,
  mangle,
  onMangleChange,
}: OptionsPanelProps) {
  const indentId = useId();
  const widthId = useId();
  const commaId = useId();
  const dialectId = useId();
  const caseId = useId();
  const js = JS_LIKE.includes(language);
  const sql = language === 'sql';
  const prettier = !sql && language !== 'xml';
  return (
    <Inline gap="4" align="center" wrap>
      <Inline gap="2" align="center" wrap={false}>
        <Label htmlFor={indentId}>Indent</Label>
        <Select
          id={indentId}
          value={String(options.indent)}
          onValueChange={(v) =>
            onChange({ indent: v === 'tab' ? 'tab' : (Number(v) as 2 | 4) })
          }
          items={[
            { value: '2', label: '2 spaces' },
            { value: '4', label: '4 spaces' },
            { value: 'tab', label: 'Tab' },
          ]}
        />
      </Inline>
      {prettier && (
        <Inline gap="2" align="center" wrap={false}>
          <Label htmlFor={widthId}>Print width</Label>
          <NumberInput
            id={widthId}
            value={options.printWidth}
            min={20}
            max={320}
            onValueChange={(v) => onChange({ printWidth: v })}
          />
        </Inline>
      )}
      {js && (
        <>
          <Toggle
            label="Single quotes"
            checked={options.singleQuote}
            onChange={(v) => onChange({ singleQuote: v })}
          />
          <Toggle
            label="Semicolons"
            checked={options.semi}
            onChange={(v) => onChange({ semi: v })}
          />
          <Inline gap="2" align="center" wrap={false}>
            <Label htmlFor={commaId}>Trailing commas</Label>
            <Select
              id={commaId}
              value={options.trailingComma}
              onValueChange={(v) =>
                onChange({ trailingComma: v as FormatOptions['trailingComma'] })
              }
              items={[
                { value: 'all', label: 'All' },
                { value: 'es5', label: 'ES5' },
                { value: 'none', label: 'None' },
              ]}
            />
          </Inline>
        </>
      )}
      {prettier && (
        <Toggle
          label="Bracket spacing"
          checked={options.bracketSpacing}
          onChange={(v) => onChange({ bracketSpacing: v })}
        />
      )}
      {sql && (
        <>
          <Inline gap="2" align="center" wrap={false}>
            <Label htmlFor={dialectId}>Dialect</Label>
            <Select
              id={dialectId}
              value={options.sqlDialect}
              onValueChange={(v) =>
                onChange({ sqlDialect: v as FormatOptions['sqlDialect'] })
              }
              items={SQL_DIALECTS.map((d) => ({
                value: d,
                label: SQL_DIALECT_LABEL[d],
              }))}
            />
          </Inline>
          <Inline gap="2" align="center" wrap={false}>
            <Label htmlFor={caseId}>Keywords</Label>
            <Select
              id={caseId}
              value={options.keywordCase}
              onValueChange={(v) =>
                onChange({ keywordCase: v as FormatOptions['keywordCase'] })
              }
              items={[
                { value: 'upper', label: 'Upper case' },
                { value: 'lower', label: 'Lower case' },
                { value: 'preserve', label: 'As written' },
              ]}
            />
          </Inline>
        </>
      )}
      {language === 'javascript' && (
        <Toggle
          label="Mangle names"
          checked={mangle}
          onChange={onMangleChange}
        />
      )}
    </Inline>
  );
}
