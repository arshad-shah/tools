import React, { useState } from 'react';
import {
  IconBarChart2,
  IconHistory,
  IconListTodo,
  IconSettings2,
} from '@/shared/ui/icons';
import {
  Box,
  Drawer,
  Inline,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { HistoryPanel } from './HistoryPanel';
import { SettingsPanel } from './SettingsPanel';
import { StatsPanel } from './StatsPanel';
import { TaskList } from './TaskList';

export const MenuDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [tab, setTab] = useState<'tasks' | 'stats' | 'history' | 'settings'>(
    'tasks',
  );
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      side="right"
      title="Menu"
    >
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        variant="soft"
        fullWidth
      >
        <TabsList aria-label="Menu sections">
          <TabsTrigger value="tasks">
            <Inline gap="2" align="center" wrap={false}>
              <IconListTodo size="sm" />
              <span>Tasks</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Inline gap="2" align="center" wrap={false}>
              <IconBarChart2 size="sm" />
              <span>Stats</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="history">
            <Inline gap="2" align="center" wrap={false}>
              <IconHistory size="sm" />
              <span>History</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Inline gap="2" align="center" wrap={false}>
              <IconSettings2 size="sm" />
              <span>Settings</span>
            </Inline>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <Box className="pt-4">
            <TaskList />
          </Box>
        </TabsContent>
        <TabsContent value="stats">
          <Box className="pt-4">
            <StatsPanel />
          </Box>
        </TabsContent>
        <TabsContent value="history">
          <Box className="pt-4">
            <HistoryPanel />
          </Box>
        </TabsContent>
        <TabsContent value="settings">
          <Box className="pt-4">
            <SettingsPanel />
          </Box>
        </TabsContent>
      </Tabs>
    </Drawer>
  );
};
