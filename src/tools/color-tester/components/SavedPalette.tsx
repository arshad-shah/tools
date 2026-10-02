import React from 'react';
import { IconDownload, IconTrash2 } from '@/shared/ui/icons';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { ColorInfo } from '../types';
import { Swatch } from './Swatch';

interface SavedPaletteProps {
  savedColors: ColorInfo[];
  exportPalette: () => void;
  loadColor: (c: ColorInfo) => void;
  deleteColor: (index: number) => void;
}

export const SavedPalette: React.FC<SavedPaletteProps> = ({
  savedColors,
  exportPalette,
  loadColor,
  deleteColor,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center" wrap>
        <CardTitle as="h3">Saved palette</CardTitle>
        <Button
          variant="soft"
          size="sm"
          leftIcon={<IconDownload size="sm" />}
          disabled={savedColors.length === 0}
          onClick={exportPalette}
        >
          Export
        </Button>
      </Inline>
    </CardHeader>
    <CardBody>
      {savedColors.length === 0 ? (
        <Text size="sm" tone="subtle" className="text-center">
          No colours saved yet. Click Save to add one.
        </Text>
      ) : (
        <Grid max={4} gap="3">
          {savedColors.map((c, idx) => (
            <Card
              key={`${c.hex}-${idx}`}
              interactive
              onClick={() => loadColor(c)}
            >
              <CardBody>
                <Stack gap="2" align="center">
                  <Swatch color={c.hex} size="lg" rounded={false} />
                  <Stack gap="0" align="center">
                    <Text size="xs" weight="semibold">
                      {c.name || c.hex}
                    </Text>
                    <Text size="xs" tone="subtle">
                      {c.hex}
                    </Text>
                  </Stack>
                  <IconButton
                    variant="danger"
                    size="sm"
                    label="Delete colour"
                    icon={<IconTrash2 size="xs" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteColor(idx);
                    }}
                  />
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Grid>
      )}
    </CardBody>
  </Card>
);
