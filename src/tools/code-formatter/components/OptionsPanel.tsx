import {
  Button,
  Grid,
  NumberField,
  Popover,
  Select,
  Stack,
  Switch,
} from '@arshad-shah/cynosure';
import { settings as settingsIcon } from '@arshad-shah/cynosure/icons';
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

/** Options for the chosen language (Prettier subset, SQL, minifier), behind one button. */
export function OptionsPanel({
  language,
  options,
  onChange,
  mangle,
  onMangleChange,
}: OptionsPanelProps) {
  const js = JS_LIKE.includes(language);
  const sql = language === 'sql';
  const prettier = !sql && language !== 'xml';
  return (
    <Popover
      label="Formatting options"
      size="lg"
      trigger={(props) => (
        <Button {...props} variant="soft" icon={settingsIcon}>
          Options
        </Button>
      )}
    >
      <Stack gap="5">
        <Grid columns={2} gap="4">
          <Select
            label="Indent"
            value={String(options.indent)}
            onChange={(v) =>
              onChange({ indent: v === 'tab' ? 'tab' : (Number(v) as 2 | 4) })
            }
            options={[
              { value: '2', label: '2 spaces' },
              { value: '4', label: '4 spaces' },
              { value: 'tab', label: 'Tab' },
            ]}
          />
          {prettier ? (
            <NumberField
              label="Print width"
              value={options.printWidth}
              min={20}
              max={320}
              onChange={(v) => v !== null && onChange({ printWidth: v })}
            />
          ) : null}
          {js ? (
            <Select
              label="Trailing commas"
              value={options.trailingComma}
              onChange={(v) =>
                onChange({ trailingComma: v as FormatOptions['trailingComma'] })
              }
              options={[
                { value: 'all', label: 'All' },
                { value: 'es5', label: 'ES5' },
                { value: 'none', label: 'None' },
              ]}
            />
          ) : null}
          {sql ? (
            <>
              <Select
                label="Dialect"
                value={options.sqlDialect}
                onChange={(v) =>
                  onChange({ sqlDialect: v as FormatOptions['sqlDialect'] })
                }
                options={SQL_DIALECTS.map((d) => ({
                  value: d,
                  label: SQL_DIALECT_LABEL[d],
                }))}
              />
              <Select
                label="Keywords"
                value={options.keywordCase}
                onChange={(v) =>
                  onChange({ keywordCase: v as FormatOptions['keywordCase'] })
                }
                options={[
                  { value: 'upper', label: 'Upper case' },
                  { value: 'lower', label: 'Lower case' },
                  { value: 'preserve', label: 'As written' },
                ]}
              />
            </>
          ) : null}
        </Grid>
        <Stack gap="3">
          {js ? (
            <>
              <Switch
                label="Single quotes"
                checked={options.singleQuote}
                onChange={(v) => onChange({ singleQuote: v })}
              />
              <Switch
                label="Semicolons"
                checked={options.semi}
                onChange={(v) => onChange({ semi: v })}
              />
            </>
          ) : null}
          {prettier ? (
            <Switch
              label="Bracket spacing"
              checked={options.bracketSpacing}
              onChange={(v) => onChange({ bracketSpacing: v })}
            />
          ) : null}
          {language === 'javascript' ? (
            <Switch
              label="Mangle names"
              checked={mangle}
              onChange={onMangleChange}
            />
          ) : null}
        </Stack>
      </Stack>
    </Popover>
  );
}
