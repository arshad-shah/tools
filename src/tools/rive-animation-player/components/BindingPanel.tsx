import { useReducer } from 'react';
import {
  Button,
  ColorField,
  NumberField,
  Select,
  Stack,
  Switch,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { zap } from '@arshad-shah/cynosure/icons';
import { parseColor } from '@/shared/lib/colour';
import {
  argbToCss,
  isEditable,
  writeProperty,
  type EditableType,
  type ViewModelInstance,
} from '../lib/binding';

type Instance = ViewModelInstance;

function PropertyControl({
  vmi,
  name,
  type,
  onSet,
}: {
  vmi: Instance;
  name: string;
  type: EditableType;
  onSet: () => void;
}) {
  const set = (value: unknown) => {
    writeProperty(vmi, type, name, value);
    onSet();
  };
  switch (type) {
    case 'number': {
      const p = vmi.number(name);
      if (!p) return null;
      return (
        <NumberField
          label={name}
          value={p.value}
          step={0.1}
          onChange={(v) => v !== null && set(v)}
        />
      );
    }
    case 'string': {
      const p = vmi.string(name);
      if (!p) return null;
      return <TextField label={name} value={p.value} onChange={set} />;
    }
    case 'boolean': {
      const p = vmi.boolean(name);
      if (!p) return null;
      return <Switch label={name} checked={p.value} onChange={set} />;
    }
    case 'color': {
      const p = vmi.color(name);
      if (!p) return null;
      return (
        <ColorField
          label={name}
          alpha
          value={argbToCss(p.value)}
          onChange={(css) => set(parseColor(css))}
        />
      );
    }
    case 'enumType': {
      const p = vmi.enum(name);
      if (!p) return null;
      return (
        <Select
          label={name}
          value={p.value}
          onChange={set}
          options={p.values.map((v) => ({ value: v, label: v }))}
        />
      );
    }
    case 'trigger': {
      const p = vmi.trigger(name);
      if (!p) return null;
      return (
        <Button variant="soft" size="sm" icon={zap} onClick={() => set(null)}>
          {`Fire ${name}`}
        </Button>
      );
    }
    default:
      return null;
  }
}

/** View-model properties of the bound instance, editable live. */
export function BindingPanel({ vmi }: { vmi: ViewModelInstance | null }) {
  // The runtime holds the values; re-render after each change to read them.
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  if (!vmi)
    return (
      <Text size="sm" tone="muted">
        This file has no data bindings.
      </Text>
    );
  const props = vmi.properties.filter((p) => isEditable(p.type));
  const other = vmi.properties.length - props.length;
  return (
    <Stack gap="4">
      <Text size="sm" tone="muted">
        View model {vmi.viewModelName}
      </Text>
      {props.map((p) => (
        <PropertyControl
          key={p.name}
          vmi={vmi}
          name={p.name}
          type={p.type as EditableType}
          onSet={rerender}
        />
      ))}
      {other > 0 && (
        <Text size="sm" tone="muted">
          {other === 1
            ? '1 property (a list, image, artboard or nested view model) is not editable here.'
            : `${other} properties (lists, images, artboards or nested view models) are not editable here.`}
        </Text>
      )}
    </Stack>
  );
}
