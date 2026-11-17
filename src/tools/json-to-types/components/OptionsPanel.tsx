import { Button, Popover, Select, Stack, Switch } from '@arshad-shah/cynosure';
import { settings as settingsIcon } from '@arshad-shah/cynosure/icons';
import type { GenerateOptions } from '../lib/generate';

interface OptionsPanelProps {
  options: GenerateOptions;
  onChange(patch: Partial<GenerateOptions>): void;
}

/** Inference and per-language options, behind one button. */
export function OptionsPanel({ options, onChange }: OptionsPanelProps) {
  return (
    <Popover
      label="Type options"
      size="lg"
      trigger={(props) => (
        <Button {...props} variant="soft" icon={settingsIcon}>
          Options
        </Button>
      )}
    >
      <Stack gap="5">
        <Switch
          label="Detect dates"
          description="Strings that are all ISO 8601 dates or date-times become date types."
          checked={options.detectDates}
          onChange={(detectDates) => onChange({ detectDates })}
        />
        <Switch
          label="Top-level array is a list of samples"
          description="Each item is one sample of the root type, instead of the root being an array."
          checked={options.arrayAsSamples}
          onChange={(arrayAsSamples) => onChange({ arrayAsSamples })}
        />
        {options.target === 'typescript' ? (
          <Select
            label="TypeScript declarations"
            value={options.tsDeclaration}
            onChange={(v) =>
              onChange({ tsDeclaration: v === 'type' ? 'type' : 'interface' })
            }
            options={[
              { value: 'interface', label: 'Interfaces' },
              { value: 'type', label: 'Type aliases' },
            ]}
          />
        ) : null}
        {options.target === 'python' ? (
          <Select
            label="Python classes"
            value={options.pythonStyle}
            onChange={(v) =>
              onChange({
                pythonStyle: v === 'typeddict' ? 'typeddict' : 'dataclass',
              })
            }
            options={[
              { value: 'dataclass', label: 'Dataclasses' },
              { value: 'typeddict', label: 'TypedDict' },
            ]}
          />
        ) : null}
      </Stack>
    </Popover>
  );
}
