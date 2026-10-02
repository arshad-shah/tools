import { useId, useState } from 'react';
import { notify } from '@/shared/lib/notify';
import { IconSave, IconTrash } from '@/shared/ui/icons';
import {
  Button,
  Heading,
  IconButton,
  Inline,
  Input,
  Label,
  Stack,
  Swatch,
  Text,
} from '@/shared/ui';
import type { SavedPalette } from '../settings';

export const MAX_SAVED = 50;

export interface SavedPalettesProps {
  saved: SavedPalette[];
  onSavedChange(next: SavedPalette[]): void;
  /** What "Save" stores (hex colours). */
  current: string[];
  onLoad(colors: string[]): void;
}

/** Named palettes kept in the tool's settings: save, load and delete. */
export function SavedPalettes({
  saved,
  onSavedChange,
  current,
  onLoad,
}: SavedPalettesProps) {
  const id = useId();
  const [name, setName] = useState('');
  const trimmed = name.trim();

  const save = () => {
    if (!trimmed) return;
    const rest = saved.filter((p) => p.name !== trimmed);
    onSavedChange(
      [{ name: trimmed, colors: [...current] }, ...rest].slice(0, MAX_SAVED),
    );
    notify.success(`Saved "${trimmed}"`);
    setName('');
  };

  return (
    <Stack gap="3">
      <Heading level={3} size="md">
        Saved palettes
      </Heading>
      <Inline gap="2" align="end" wrap>
        <Stack gap="1" className="min-w-48 flex-1">
          <Label htmlFor={`${id}-name`}>Palette name</Label>
          <Input
            id={`${id}-name`}
            value={name}
            onChange={setName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
            autoComplete="off"
          />
        </Stack>
        <Button
          size="sm"
          leftIcon={<IconSave size="sm" />}
          disabled={!trimmed}
          onClick={save}
        >
          Save palette
        </Button>
      </Inline>
      {saved.length === 0 ? (
        <Text size="sm" tone="muted">
          No saved palettes yet. Saving keeps the working palette, or the scale
          when the working palette is empty.
        </Text>
      ) : (
        <Stack gap="2" role="list" aria-label="Saved palettes">
          {saved.map((p) => (
            <Inline key={p.name} gap="2" align="center" role="listitem">
              <Text as="span" size="sm" weight="medium" className="min-w-24">
                {p.name}
              </Text>
              <Inline gap="1">
                {p.colors.slice(0, 12).map((c, i) => (
                  <Swatch key={`${c}-${i}`} color={c} label={c} size="sm" />
                ))}
              </Inline>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onLoad([...p.colors])}
                aria-label={`Load ${p.name}`}
              >
                Load
              </Button>
              <IconButton
                label={`Delete ${p.name}`}
                icon={IconTrash}
                size="sm"
                variant="ghost"
                tone="danger"
                onClick={() =>
                  onSavedChange(saved.filter((q) => q.name !== p.name))
                }
              />
            </Inline>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
