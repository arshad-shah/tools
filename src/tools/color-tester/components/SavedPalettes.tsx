import {
  Badge,
  Button,
  Grid,
  Heading,
  IconButton,
  Inline,
  ListRow,
  ListRows,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { save as saveIcon, trash, upload } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import { notify } from '@/shared/lib/notify';
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
    <Stack gap="4">
      <Heading level={3} size="sm">
        Saved palettes
      </Heading>
      <Grid columns="minmax(0, 1fr) auto" gap="2" align="end">
        <TextField
          label="Palette name"
          size="sm"
          value={name}
          onChange={setName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          autoComplete="off"
        />
        <Button
          size="sm"
          variant="soft"
          icon={saveIcon}
          disabled={!trimmed}
          onClick={save}
        >
          Save palette
        </Button>
      </Grid>
      {saved.length === 0 ? (
        <Text size="sm" tone="muted">
          No saved palettes yet. Saving keeps the working palette, or the scale
          when the working palette is empty.
        </Text>
      ) : (
        <ListRows label="Saved palettes" divided>
          {saved.map((p) => (
            <ListRow
              key={p.name}
              label={p.name}
              description={
                <Inline gap="1" wrap>
                  {p.colors.slice(0, 12).map((c, i) => (
                    <Badge key={`${c}-${i}`} dot color={c} />
                  ))}
                </Inline>
              }
              trailing={`${p.colors.length} colours`}
              actions={
                <>
                  <IconButton
                    label={`Load ${p.name}`}
                    icon={upload}
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoad([...p.colors])}
                  />
                  <IconButton
                    label={`Delete ${p.name}`}
                    icon={trash}
                    size="sm"
                    variant="ghost"
                    tone="danger"
                    onClick={() =>
                      onSavedChange(saved.filter((q) => q.name !== p.name))
                    }
                  />
                </>
              }
            />
          ))}
        </ListRows>
      )}
    </Stack>
  );
}
