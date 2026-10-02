import { useReducer } from 'react';
import { IconZap } from '@/shared/ui/icons';
import {
  Button,
  ColorField,
  Inline,
  Input,
  Label,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
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
  const id = `vm-${name}`;
  const set = (value: unknown) => {
    writeProperty(vmi, type, name, value);
    onSet();
  };
  const label = <Label htmlFor={id}>{name}</Label>;
  switch (type) {
    case 'number': {
      const p = vmi.number(name);
      if (!p) return null;
      return (
        <Stack gap="1">
          {label}
          <NumberInput id={id} value={p.value} step={0.1} onValueChange={set} />
        </Stack>
      );
    }
    case 'string': {
      const p = vmi.string(name);
      if (!p) return null;
      return (
        <Stack gap="1">
          {label}
          <Input id={id} value={p.value} onChange={set} />
        </Stack>
      );
    }
    case 'boolean': {
      const p = vmi.boolean(name);
      if (!p) return null;
      return (
        <Inline gap="2" align="center">
          <Switch id={id} checked={p.value} onCheckedChange={set} />
          {label}
        </Inline>
      );
    }
    case 'color': {
      const p = vmi.color(name);
      if (!p) return null;
      return (
        <ColorField
          label={name}
          alpha
          value={argbToCss(p.value)}
          onChange={(_css, c) => set(c)}
        />
      );
    }
    case 'enumType': {
      const p = vmi.enum(name);
      if (!p) return null;
      return (
        <Stack gap="1">
          {label}
          <Select
            id={id}
            value={p.value}
            onValueChange={set}
            items={p.values.map((v) => ({ value: v, label: v }))}
            aria-label={name}
          />
        </Stack>
      );
    }
    case 'trigger': {
      const p = vmi.trigger(name);
      if (!p) return null;
      return (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<IconZap size="sm" />}
          onClick={() => set(null)}
        >
          Fire {name}
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
      <Text size="sm" tone="subtle">
        This file has no data bindings.
      </Text>
    );
  const props = vmi.properties.filter((p) => isEditable(p.type));
  const other = vmi.properties.length - props.length;
  return (
    <Stack gap="3">
      <Text size="sm" tone="subtle">
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
        <Text size="xs" tone="subtle">
          {other === 1
            ? '1 property (a list, image, artboard or nested view model) is not editable here.'
            : `${other} properties (lists, images, artboards or nested view models) are not editable here.`}
        </Text>
      )}
    </Stack>
  );
}
