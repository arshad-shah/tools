import React from 'react';
import { IconRotateCcw } from '@/shared/ui/icons';

import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { DiffSettings, HighlightMode } from '../types';

interface DiffSettingsPanelProps {
  diffSettings: DiffSettings;
  updateDiffSetting: (key: keyof DiffSettings, value: boolean | number) => void;
  resetSettings: () => void;
  highlightMode: HighlightMode;
  setHighlightMode: (mode: HighlightMode) => void;
}

/** The comparison toggles and the highlight level. */
export const DiffSettingsPanel: React.FC<DiffSettingsPanelProps> = ({
  diffSettings,
  updateDiffSetting,
  resetSettings,
  highlightMode,
  setHighlightMode,
}) => (
  <Card>
    <CardBody>
      <Stack gap="3">
        <Inline gap="2" wrap>
          <Button
            variant={diffSettings.ignoreWhitespace ? 'solid' : 'soft'}
            size="sm"
            onClick={() =>
              updateDiffSetting(
                'ignoreWhitespace',
                !diffSettings.ignoreWhitespace,
              )
            }
          >
            Ignore whitespace
          </Button>
          <Button
            variant={diffSettings.ignoreCase ? 'solid' : 'soft'}
            size="sm"
            onClick={() =>
              updateDiffSetting('ignoreCase', !diffSettings.ignoreCase)
            }
          >
            Ignore case
          </Button>
          <Button
            variant={diffSettings.highlightIntralineChanges ? 'solid' : 'soft'}
            size="sm"
            onClick={() =>
              updateDiffSetting(
                'highlightIntralineChanges',
                !diffSettings.highlightIntralineChanges,
              )
            }
          >
            Intraline changes
          </Button>
          <Button
            variant={diffSettings.showLineNumbers ? 'solid' : 'soft'}
            size="sm"
            onClick={() =>
              updateDiffSetting(
                'showLineNumbers',
                !diffSettings.showLineNumbers,
              )
            }
          >
            Line numbers
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<IconRotateCcw size="sm" />}
            onClick={resetSettings}
          >
            Reset
          </Button>
        </Inline>

        <Inline gap="2" wrap align="center">
          <Text size="sm" tone="subtle">
            Highlight level:
          </Text>
          <ButtonGroup>
            {(['character', 'word', 'line'] as const).map((mode) => (
              <Button
                key={mode}
                variant={highlightMode === mode ? 'solid' : 'soft'}
                size="sm"
                onClick={() => setHighlightMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </ButtonGroup>
        </Inline>
      </Stack>
    </CardBody>
  </Card>
);
