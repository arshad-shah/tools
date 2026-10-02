import React from 'react';
import {
  IconArrowRightLeft,
  IconBarChart2,
  IconCode,
  IconDownload,
  IconMoveRight,
  IconPlay,
  IconRotateCcw,
  IconSplit,
  IconTrash,
} from '@/shared/ui/icons';

import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Heading,
  Inline,
  Stack,
} from '@/shared/ui';
import type { DiffViewMode, DiffViewModeId } from '../types';

const VIEW_MODES: DiffViewMode[] = [
  { id: 'split', name: 'Split', icon: <IconSplit size="sm" /> },
  { id: 'unified', name: 'Unified', icon: <IconMoveRight size="sm" /> },
  { id: 'inline', name: 'Inline', icon: <IconCode size="sm" /> },
];

interface DiffToolbarProps {
  showStats: boolean;
  setShowStats: (show: boolean) => void;
  autoRefresh: boolean;
  setAutoRefresh: (auto: boolean) => void;
  isDiffing: boolean;
  hasResults: boolean;
  diffViewMode: DiffViewModeId;
  setDiffViewMode: (mode: DiffViewModeId) => void;
  onRefresh: () => void;
  onSwap: () => void;
  onExport: () => void;
  onClear: () => void;
}

/** Title, the Stats/Auto/Refresh/Swap/Export/Clear actions and the view modes. */
export const DiffToolbar: React.FC<DiffToolbarProps> = ({
  showStats,
  setShowStats,
  autoRefresh,
  setAutoRefresh,
  isDiffing,
  hasResults,
  diffViewMode,
  setDiffViewMode,
  onRefresh,
  onSwap,
  onExport,
  onClear,
}) => (
  <Card>
    <CardBody>
      <Stack gap="4">
        <Inline justify="between" align="center" wrap gap="3">
          <Inline align="center" gap="2">
            <IconSplit size="lg" />
            <Heading level={2} size="lg">
              Text Diff Checker
            </Heading>
          </Inline>
          <Inline gap="2" wrap>
            <Button
              variant={showStats ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={<IconBarChart2 size="sm" />}
              onClick={() => setShowStats(!showStats)}
            >
              Stats
            </Button>
            <Button
              variant={autoRefresh ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={<IconPlay size="sm" />}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            {!autoRefresh && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<IconRotateCcw size="sm" />}
                disabled={isDiffing}
                onClick={onRefresh}
              >
                Refresh
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconArrowRightLeft size="sm" />}
              disabled={isDiffing}
              onClick={onSwap}
            >
              Swap
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconDownload size="sm" />}
              disabled={!hasResults}
              onClick={onExport}
            >
              Export
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<IconTrash size="sm" />}
              disabled={isDiffing}
              onClick={onClear}
            >
              Clear
            </Button>
          </Inline>
        </Inline>

        <ButtonGroup>
          {VIEW_MODES.map((mode) => (
            <Button
              key={mode.id}
              variant={diffViewMode === mode.id ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={mode.icon}
              onClick={() => setDiffViewMode(mode.id)}
            >
              {mode.name}
            </Button>
          ))}
        </ButtonGroup>
      </Stack>
    </CardBody>
  </Card>
);
