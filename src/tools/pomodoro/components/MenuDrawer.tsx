import React, { useState } from 'react';
import { BarChart2, ListTodo, Settings2 } from 'lucide-react';
import {
  Box,
  Drawer,
  Inline,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { SettingsPanel } from './SettingsPanel';
import { StatsPanel } from './StatsPanel';
import { TaskList } from './TaskList';

export const MenuDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [tab, setTab] = useState<'tasks' | 'stats' | 'settings'>('tasks');
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
              <ListTodo size={14} aria-hidden />
              <span>Tasks</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Inline gap="2" align="center" wrap={false}>
              <BarChart2 size={14} aria-hidden />
              <span>Stats</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Inline gap="2" align="center" wrap={false}>
              <Settings2 size={14} aria-hidden />
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
        <TabsContent value="settings">
          <Box className="pt-4">
            <SettingsPanel />
          </Box>
        </TabsContent>
      </Tabs>
    </Drawer>
  );
};
