import {
  Button,
  Dialog,
  Grid,
  GridItem,
  SegmentedControl,
  Sheet,
  Stack,
} from '@arshad-shah/cynosure';
import { chartBar, settings } from '@arshad-shah/cynosure/icons';
import React, { useState } from 'react';
import { ToolActions } from '@/app/ui/tool-actions';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { StatsPanel } from './components/StatsPanel';
import { TaskList } from './components/TaskList';
import { TimerCard } from './components/TimerCard';

type ProgressView = 'stats' | 'history';

/**
 * Pomodoro (redesign): the timer beside today's tasks; statistics and the
 * session history in a side sheet; settings in a dialog. The store hydrates
 * synchronously from localStorage: no provider or gate.
 */
const Pomodoro: React.FC = () => {
  const [progressOpen, setProgressOpen] = useState(false);
  const [view, setView] = useState<ProgressView>('stats');
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <Stack gap="6">
      <ToolActions>
        <Button
          variant="ghost"
          icon={chartBar}
          onClick={() => setProgressOpen(true)}
        >
          Progress
        </Button>
        <Button
          variant="ghost"
          icon={settings}
          onClick={() => setSettingsOpen(true)}
        >
          Settings
        </Button>
      </ToolActions>
      <Grid columns={{ base: 1, lg: 5 }} gap="6" align="start">
        <GridItem span={{ base: 'full', lg: 3 }}>
          <TimerCard />
        </GridItem>
        <GridItem span={{ base: 'full', lg: 2 }}>
          <TaskList />
        </GridItem>
      </Grid>
      <Sheet
        open={progressOpen}
        onOpenChange={setProgressOpen}
        title="Progress"
        side="end"
        size="md"
      >
        <Stack gap="5">
          <SegmentedControl
            label="Progress views"
            fullWidth
            value={view}
            onChange={(v) => setView(v as ProgressView)}
            options={[
              { value: 'stats', label: 'Statistics' },
              { value: 'history', label: 'History' },
            ]}
          />
          {view === 'stats' ? <StatsPanel /> : <HistoryPanel />}
        </Stack>
      </Sheet>
      <Dialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Timer settings"
        size="lg"
      >
        <SettingsPanel />
      </Dialog>
    </Stack>
  );
};

export default Pomodoro;
