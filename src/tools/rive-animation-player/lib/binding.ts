import type { Rive } from '@/shared/ui/adapters/rive-runtime';

export type ViewModelInstance = NonNullable<Rive['viewModelInstance']>;

/** Property types the Data tab can edit (the runtime's DataType values). */
export type EditableType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'color'
  | 'enumType'
  | 'trigger';

const EDITABLE = new Set<string>([
  'number',
  'string',
  'boolean',
  'color',
  'enumType',
  'trigger',
]);

export const isEditable = (type: unknown): type is EditableType =>
  EDITABLE.has(String(type));

/** ARGB integer (the runtime's colour value) as a CSS colour. */
export function argbToCss(v: number): string {
  const a = ((v >>> 24) & 255) / 255;
  const [r, g, b] = [(v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

const byte = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255);

/**
 * Writes a view-model property. Colours take `{ r, g, b, alpha }` in 0-1;
 * triggers ignore the value and fire.
 */
export function writeProperty(
  vmi: ViewModelInstance,
  type: EditableType,
  name: string,
  value: unknown,
): void {
  switch (type) {
    case 'number': {
      const p = vmi.number(name);
      if (p) p.value = Number(value);
      return;
    }
    case 'string': {
      const p = vmi.string(name);
      if (p) p.value = String(value);
      return;
    }
    case 'boolean': {
      const p = vmi.boolean(name);
      if (p) p.value = Boolean(value);
      return;
    }
    case 'enumType': {
      const p = vmi.enum(name);
      if (p) p.value = String(value);
      return;
    }
    case 'color': {
      const c = value as { r: number; g: number; b: number; alpha: number };
      vmi.color(name)?.argb(byte(c.alpha), byte(c.r), byte(c.g), byte(c.b));
      return;
    }
    case 'trigger':
      vmi.trigger(name)?.trigger();
  }
}

/**
 * The view-model instance bound to the artboard, binding the file's default
 * instance first when nothing is bound (what the Rive editor shows). Files
 * without view models are left alone: asking them for one logs an error.
 */
export function bindDefault(rive: Rive): ViewModelInstance | null {
  if (rive.viewModelInstance) return rive.viewModelInstance;
  if (!(rive.viewModelCount > 0)) return null;
  const instance = rive.defaultViewModel()?.defaultInstance() ?? null;
  if (instance) rive.bindViewModelInstance(instance);
  return instance;
}
