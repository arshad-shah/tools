import React, { useCallback, useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import {
  Award,
  BarChart2,
  Battery,
  Brain,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Coffee,
  Flame,
  ListTodo,
  Menu,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SkipForward,
  Sparkles,
  Target,
  Timer as TimerIcon,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Container,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Grid,
  Heading,
  IconButton,
  Inline,
  Input,
  Label,
  LinearProgress,
  Slider,
  Stack,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@arshad-shah/cynosure-react';
import { store, persistor } from './store';
import {
  addTask,
  deleteTask,
  setCurrentTask,
  updateSettings,
  updateStats,
  updateTask,
  updateTimer,
} from './store';
import { useAppDispatch, useAppSelector } from './hook';
import { Task } from '../../types/PomodoroTypes';
import { AUDIO_BASE_64 } from './Audio';
import usePomodoroTimer from './hooks/usePomodoro';

type Mode = 'work' | 'shortBreak' | 'longBreak';

const MODE_INFO: Record<
  Mode,
  {
    icon: typeof Brain;
    label: string;
    shortLabel: string;
    colorScheme: 'accent' | 'success';
  }
> = {
  work: {
    icon: Brain,
    label: 'Focus Time',
    shortLabel: 'Focus',
    colorScheme: 'accent',
  },
  shortBreak: {
    icon: Coffee,
    label: 'Short Break',
    shortLabel: 'Break',
    colorScheme: 'accent',
  },
  longBreak: {
    icon: Battery,
    label: 'Long Break',
    shortLabel: 'Long',
    colorScheme: 'success',
  },
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ModeSelector: React.FC<{
  currentMode: Mode;
  onChange: (mode: Mode) => void;
}> = ({ currentMode, onChange }) => (
  <Grid columns={{ base: 1, sm: 3 }} gap="2">
    {(Object.keys(MODE_INFO) as Mode[]).map((mode) => {
      const info = MODE_INFO[mode];
      const Icon = info.icon;
      const isActive = currentMode === mode;
      return (
        <Button
          key={mode}
          variant={isActive ? 'solid' : 'soft'}
          colorScheme={isActive ? info.colorScheme : 'neutral'}
          size="md"
          leftIcon={<Icon size={16} />}
          onClick={() => onChange(mode)}
          fullWidth
        >
          {info.label}
        </Button>
      );
    })}
  </Grid>
);

const CurrentTaskCard: React.FC = () => {
  const currentTaskId = useAppSelector((state) => state.timer.currentTask);
  const tasks = useAppSelector((state) => state.tasks);
  const dispatch = useAppDispatch();
  const currentTask = tasks.find((t: Task) => t.id === currentTaskId);

  if (!currentTask) {
    const nextTask = tasks.find((t: Task) => !t.completed);
    if (!nextTask) {
      return (
        <Alert status="info" variant="soft" icon={<ListTodo aria-hidden />}>
          <AlertDescription>
            No active task. Add tasks from the menu to get started.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Card variant="filled" size="sm">
        <CardBody>
          <Inline justify="between" align="center" gap="3" wrap>
            <Inline align="center" gap="2">
              <ListTodo size={18} aria-hidden />
              <Stack gap="0">
                <Text size="xs" variant="caption">
                  Start working on:
                </Text>
                <Text size="sm" weight="medium">
                  {nextTask.title}
                </Text>
              </Stack>
            </Inline>
            <Button
              variant="solid"
              colorScheme="accent"
              size="sm"
              onClick={() => dispatch(setCurrentTask(nextTask.id))}
            >
              Start task
            </Button>
          </Inline>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="outlined" size="sm">
      <CardBody>
        <Inline justify="between" align="center" gap="3" wrap>
          <Inline align="center" gap="2">
            {currentTask.completed ? (
              <CheckCircle2 size={20} aria-hidden />
            ) : (
              <Circle size={20} aria-hidden />
            )}
            <Text size="sm" weight="medium">
              {currentTask.title}
            </Text>
          </Inline>
          <Badge variant="soft" colorScheme="accent" size="sm" shape="pill">
            {currentTask.completedPomodoros}/{currentTask.pomodoros} pomodoros
          </Badge>
        </Inline>
      </CardBody>
    </Card>
  );
};

const Timer: React.FC = () => {
  const timer = useAppSelector((state) => {
    const { mode, timeLeft, isActive, currentTask } = state.timer;
    return { mode, timeLeft, isActive, currentTask: currentTask ?? null };
  });
  const settings = useAppSelector((state) => state.settings);
  const stats = useAppSelector((state) => state.stats);
  const currentTask = useAppSelector((state) =>
    state.tasks.find((task: Task) => task.id === timer.currentTask),
  );

  const dispatch = useAppDispatch();
  const info = MODE_INFO[timer.mode];
  const Icon = info.icon;

  const getCurrentDuration = useCallback(
    () =>
      ({
        work: settings.workDuration,
        shortBreak: settings.shortBreakDuration,
        longBreak: settings.longBreakDuration,
      })[timer.mode],
    [settings, timer.mode],
  );

  const progress = useMemo(() => {
    const total = getCurrentDuration() * 60;
    return ((total - timer.timeLeft) / total) * 100;
  }, [getCurrentDuration, timer.timeLeft]);

  const handleTimerComplete = useCallback(() => {
    if (timer.mode === 'work') {
      dispatch(
        updateStats({
          dailyPomodoros: stats.dailyPomodoros + 1,
          weeklyPomodoros: stats.weeklyPomodoros + 1,
          totalFocusTime: stats.totalFocusTime + settings.workDuration,
        }),
      );
      dispatch(
        updateTimer({
          mode: 'shortBreak',
          timeLeft: settings.shortBreakDuration * 60,
          isActive: settings.autoStartBreaks,
        }),
      );
    } else {
      dispatch(
        updateTimer({
          mode: 'work',
          timeLeft: settings.workDuration * 60,
          isActive: settings.autoStartPomodoros,
        }),
      );
    }
    if (currentTask) {
      const next = currentTask.completedPomodoros + 1;
      dispatch(
        updateTask({
          id: currentTask.id,
          updates: {
            completedPomodoros: next,
            completed: next >= currentTask.pomodoros,
          },
        }),
      );
    }
    if (settings.soundEnabled) {
      try {
        const audio = new Audio(AUDIO_BASE_64);
        audio.play().catch(console.error);
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    }
  }, [timer.mode, settings, stats, dispatch, currentTask]);

  usePomodoroTimer({ timer, handleTimerComplete, formatTime });

  const handleToggle = () => {
    if (!timer.isActive && timer.mode === 'work' && !timer.currentTask) return;
    dispatch(updateTimer({ isActive: !timer.isActive }));
  };

  return (
    <Card variant="elevated" size="lg">
      <CardBody>
        <Stack gap="6">
          <ModeSelector
            currentMode={timer.mode}
            onChange={(mode) =>
              dispatch(
                updateTimer({
                  mode,
                  timeLeft: settings[`${mode}Duration`] * 60,
                  isActive: false,
                }),
              )
            }
          />

          {timer.mode === 'work' && <CurrentTaskCard />}

          <Stack gap="6" align="center">
            <Inline align="center" gap="3" wrap justify="center">
              <Icon size={28} aria-hidden />
              <Heading level={2} size="xl" weight="bold">
                {info.label}
              </Heading>
              {timer.mode === 'work' && stats.dailyPomodoros > 0 && (
                <Badge
                  variant="soft"
                  colorScheme="warning"
                  size="sm"
                  icon={<Flame size={14} aria-hidden />}
                >
                  {stats.dailyPomodoros} today
                </Badge>
              )}
            </Inline>

            <Heading
              level={1}
              size="5xl"
              weight="bold"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatTime(timer.timeLeft)}
            </Heading>

            <Inline align="center" gap="2">
              <Clock size={14} aria-hidden />
              <Text size="sm" variant="caption">
                {Math.floor(timer.timeLeft / 60)} minutes remaining
              </Text>
            </Inline>

            <Box width="full">
              <LinearProgress
                value={progress}
                max={100}
                size="md"
                colorScheme={info.colorScheme}
              />
            </Box>

            {progress >= 100 && (
              <Inline align="center" gap="2">
                <Sparkles size={16} aria-hidden />
                <Text size="sm" weight="medium">
                  Time&apos;s up!
                </Text>
              </Inline>
            )}

            <Inline gap="3" wrap justify="center">
              <Button
                variant="solid"
                colorScheme={timer.isActive ? 'danger' : info.colorScheme}
                size="lg"
                leftIcon={timer.isActive ? <Pause size={20} /> : <Play size={20} />}
                onClick={handleToggle}
              >
                {timer.isActive ? 'Pause' : 'Start'}
              </Button>
              <IconButton
                variant="soft"
                colorScheme="neutral"
                size="lg"
                label="Reset"
                icon={<RotateCcw size={20} />}
                onClick={() =>
                  dispatch(
                    updateTimer({
                      timeLeft: getCurrentDuration() * 60,
                      isActive: false,
                    }),
                  )
                }
              />
              <IconButton
                variant="soft"
                colorScheme="neutral"
                size="lg"
                label="Skip"
                icon={<SkipForward size={20} />}
                onClick={handleTimerComplete}
              />
            </Inline>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
};

const TaskRow: React.FC<{
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}> = ({ task, onToggle, onDelete }) => (
  <Card variant={task.completed ? 'filled' : 'outlined'} size="sm">
    <CardBody>
      <Inline justify="between" align="center" gap="3" wrap>
        <Inline align="center" gap="3" wrap>
          <IconButton
            variant="ghost"
            colorScheme={task.completed ? 'success' : 'neutral'}
            size="sm"
            label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            icon={
              task.completed ? (
                <CheckCircle2 size={20} />
              ) : (
                <Circle size={20} />
              )
            }
            onClick={onToggle}
          />
          <Text
            size="sm"
            weight="medium"
            style={
              task.completed
                ? { textDecoration: 'line-through', opacity: 0.6 }
                : undefined
            }
          >
            {task.title}
          </Text>
        </Inline>
        <Inline gap="2" align="center">
          <Badge
            variant="soft"
            colorScheme={
              task.completedPomodoros >= task.pomodoros ? 'success' : 'accent'
            }
            size="sm"
            shape="pill"
            icon={<TimerIcon size={12} aria-hidden />}
          >
            {task.completedPomodoros}/{task.pomodoros}
          </Badge>
          <IconButton
            variant="ghost"
            colorScheme="danger"
            size="sm"
            label="Delete task"
            icon={<Trash2 size={16} />}
            onClick={onDelete}
          />
        </Inline>
      </Inline>
    </CardBody>
  </Card>
);

const TaskList: React.FC = () => {
  const tasks = useAppSelector((state) => state.tasks);
  const dispatch = useAppDispatch();
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    dispatch(
      addTask({
        title: newTitle.trim(),
        completed: false,
        pomodoros: 1,
        completedPomodoros: 0,
      }),
    );
    setNewTitle('');
  };

  return (
    <Stack gap="4">
      <Inline justify="between" align="center" wrap>
        <Inline align="center" gap="2">
          <ListTodo size={20} aria-hidden />
          <Heading level={3} size="md" weight="semibold">
            Tasks for today
          </Heading>
        </Inline>
        {tasks.length > 0 && (
          <Badge variant="soft" colorScheme="neutral" size="sm">
            {tasks.filter((t: Task) => t.completed).length}/{tasks.length} completed
          </Badge>
        )}
      </Inline>

      <form onSubmit={handleAdd}>
        <Inline gap="2">
          <Box flex="1" minWidth="0">
            <Input
              value={newTitle}
              onChange={setNewTitle}
              placeholder="Add a new task…"
              aria-label="New task"
            />
          </Box>
          <Button
            type="submit"
            variant="solid"
            colorScheme="accent"
            disabled={!newTitle.trim()}
            leftIcon={<Plus size={16} />}
          >
            Add
          </Button>
        </Inline>
      </form>

      <Stack gap="2">
        {tasks.length === 0 ? (
          <Alert status="info" variant="soft">
            <AlertDescription>
              No tasks yet. Add one using the form above.
            </AlertDescription>
          </Alert>
        ) : (
          tasks.map((task: Task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() =>
                dispatch(
                  updateTask({ id: task.id, updates: { completed: !task.completed } }),
                )
              }
              onDelete={() => dispatch(deleteTask(task.id))}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
};

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
}> = ({ icon, label, value, subtext }) => (
  <Card variant="filled" size="sm">
    <CardBody>
      <Stack gap="1">
        <Inline gap="2" align="center">
          {icon}
          <Text size="xs" variant="caption">
            {label}
          </Text>
        </Inline>
        <Heading level={4} size="xl" weight="bold">
          {value}
        </Heading>
        {subtext && (
          <Text size="xs" variant="caption">
            {subtext}
          </Text>
        )}
      </Stack>
    </CardBody>
  </Card>
);

const Stats: React.FC = () => {
  const stats = useAppSelector((state) => state.stats);
  const settings = useAppSelector((state) => state.settings);
  const dailyGoal = 8;

  const progressToGoal = (stats.dailyPomodoros / dailyGoal) * 100;
  const totalHours = Math.floor(stats.totalFocusTime / 60);
  const totalMinutes = stats.totalFocusTime % 60;
  const averageDaily =
    stats.currentStreak > 0
      ? (stats.weeklyPomodoros / Math.min(stats.currentStreak, 7)).toFixed(1)
      : '0';

  const focusScore = useMemo(() => {
    const dailyProgress = (stats.dailyPomodoros / dailyGoal) * 100;
    const streakBonus = Math.min(stats.currentStreak * 5, 25);
    const weeklyBonus = Math.min(stats.weeklyPomodoros, 50);
    return Math.min(
      Math.floor(dailyProgress + streakBonus + weeklyBonus),
      100,
    );
  }, [stats]);

  const timePeriod = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  })();

  return (
    <Stack gap="6">
      <Inline justify="between" align="center" wrap>
        <Inline align="center" gap="2">
          <BarChart2 size={20} aria-hidden />
          <Heading level={3} size="md" weight="semibold">
            Statistics
          </Heading>
        </Inline>
        <Badge
          variant="soft"
          colorScheme="accent"
          size="sm"
          icon={<Sparkles size={12} aria-hidden />}
        >
          Good {timePeriod}!
        </Badge>
      </Inline>

      <Card variant="outlined" size="md">
        <CardHeader>
          <Inline justify="between" align="center" wrap>
            <Inline align="center" gap="2">
              <Target size={18} aria-hidden />
              <CardTitle as="h4">Daily progress</CardTitle>
            </Inline>
            <Badge variant="soft" colorScheme="accent" size="sm">
              {stats.dailyPomodoros} / {dailyGoal} pomodoros
            </Badge>
          </Inline>
        </CardHeader>
        <CardBody>
          <Stack gap="2">
            <LinearProgress
              value={progressToGoal}
              max={100}
              size="md"
              colorScheme="accent"
            />
            <Text size="sm" variant="caption">
              {progressToGoal >= 100
                ? 'Daily goal achieved — outstanding work!'
                : `${dailyGoal - stats.dailyPomodoros} pomodoros to reach your goal`}
            </Text>
          </Stack>
        </CardBody>
      </Card>

      <Grid columns={{ base: 1, sm: 2 }} gap="3">
        <StatTile
          icon={<Target size={16} aria-hidden />}
          label="Today's focus"
          value={stats.dailyPomodoros}
          subtext={`${settings.workDuration * stats.dailyPomodoros} mins focused`}
        />
        <StatTile
          icon={<Calendar size={16} aria-hidden />}
          label="Weekly progress"
          value={stats.weeklyPomodoros}
          subtext={`${averageDaily} daily average`}
        />
        <StatTile
          icon={<Clock size={16} aria-hidden />}
          label="Total focus time"
          value={`${totalHours}h ${totalMinutes}m`}
        />
        <StatTile
          icon={<Flame size={16} aria-hidden />}
          label="Current streak"
          value={`${stats.currentStreak} days`}
        />
      </Grid>

      <Card variant="elevated" size="md">
        <CardBody>
          <Inline justify="between" align="center" wrap>
            <Inline align="center" gap="2">
              <Award size={20} aria-hidden />
              <Heading level={4} size="md" weight="semibold">
                Focus score
              </Heading>
            </Inline>
            <Heading level={4} size="3xl" weight="bold">
              {focusScore}
            </Heading>
          </Inline>
          <Text size="sm" variant="caption" paddingTop="2">
            Based on your daily progress, streak, and weekly performance.
          </Text>
        </CardBody>
      </Card>

      {stats.weeklyPomodoros > 0 && (
        <Alert
          status="info"
          variant="soft"
          icon={<TrendingUp aria-hidden />}
        >
          <AlertDescription>
            {stats.weeklyPomodoros > stats.dailyPomodoros * 7
              ? "You're ahead of last week's pace!"
              : "Keep pushing to beat last week's record!"}
          </AlertDescription>
        </Alert>
      )}
    </Stack>
  );
};

const Settings: React.FC = () => {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();

  const update = (u: Partial<typeof settings>) => dispatch(updateSettings(u));

  return (
    <Stack gap="6">
      <Inline align="center" gap="2">
        <Settings2 size={20} aria-hidden />
        <Heading level={3} size="md" weight="semibold">
          Settings
        </Heading>
      </Inline>

      <Stack gap="4">
        <Inline align="center" gap="2">
          <Clock size={18} aria-hidden />
          <Heading level={4} size="sm" weight="semibold">
            Timer durations
          </Heading>
        </Inline>

        <Card variant="filled" size="sm">
          <CardBody>
            <Stack gap="3">
              <Inline justify="between" align="center" wrap>
                <Inline align="center" gap="2">
                  <TimerIcon size={16} aria-hidden />
                  <Label>Work duration</Label>
                </Inline>
                <Badge variant="soft" colorScheme="accent" size="sm">
                  {settings.workDuration} min
                </Badge>
              </Inline>
              <Slider
                value={settings.workDuration}
                onChange={(v) => update({ workDuration: v as number })}
                minValue={1}
                maxValue={60}
                step={1}
                aria-label="Work duration"
              />
            </Stack>
          </CardBody>
        </Card>

        <Card variant="filled" size="sm">
          <CardBody>
            <Stack gap="3">
              <Inline justify="between" align="center" wrap>
                <Inline align="center" gap="2">
                  <Coffee size={16} aria-hidden />
                  <Label>Short break</Label>
                </Inline>
                <Badge variant="soft" colorScheme="info" size="sm">
                  {settings.shortBreakDuration} min
                </Badge>
              </Inline>
              <Slider
                value={settings.shortBreakDuration}
                onChange={(v) => update({ shortBreakDuration: v as number })}
                minValue={1}
                maxValue={30}
                step={1}
                aria-label="Short break"
              />
            </Stack>
          </CardBody>
        </Card>

        <Card variant="filled" size="sm">
          <CardBody>
            <Stack gap="3">
              <Inline justify="between" align="center" wrap>
                <Inline align="center" gap="2">
                  <Battery size={16} aria-hidden />
                  <Label>Long break</Label>
                </Inline>
                <Badge variant="soft" colorScheme="success" size="sm">
                  {settings.longBreakDuration} min
                </Badge>
              </Inline>
              <Slider
                value={settings.longBreakDuration}
                onChange={(v) => update({ longBreakDuration: v as number })}
                minValue={5}
                maxValue={45}
                step={5}
                aria-label="Long break"
              />
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Stack gap="4">
        <Inline align="center" gap="2">
          <Play size={18} aria-hidden />
          <Heading level={4} size="sm" weight="semibold">
            Automation
          </Heading>
        </Inline>

        <Card variant="filled" size="sm">
          <CardBody>
            <Inline justify="between" align="center" gap="3" wrap>
              <Stack gap="1">
                <Label htmlFor="auto-breaks">Auto-start breaks</Label>
                <Text size="xs" variant="caption">
                  Automatically begin breaks when work sessions end
                </Text>
              </Stack>
              <Switch
                id="auto-breaks"
                checked={settings.autoStartBreaks}
                onCheckedChange={(c) => update({ autoStartBreaks: c })}
              />
            </Inline>
          </CardBody>
        </Card>

        <Card variant="filled" size="sm">
          <CardBody>
            <Inline justify="between" align="center" gap="3" wrap>
              <Stack gap="1">
                <Label htmlFor="auto-pomos">Auto-start pomodoros</Label>
                <Text size="xs" variant="caption">
                  Automatically begin new work sessions after breaks
                </Text>
              </Stack>
              <Switch
                id="auto-pomos"
                checked={settings.autoStartPomodoros}
                onCheckedChange={(c) => update({ autoStartPomodoros: c })}
              />
            </Inline>
          </CardBody>
        </Card>

        <Card variant="filled" size="sm">
          <CardBody>
            <Inline justify="between" align="center" gap="3" wrap>
              <Stack gap="1">
                <Label htmlFor="sound">Sound notifications</Label>
                <Text size="xs" variant="caption">
                  Play a sound when the timer completes
                </Text>
              </Stack>
              <Switch
                id="sound"
                checked={settings.soundEnabled}
                onCheckedChange={(c) => update({ soundEnabled: c })}
              />
            </Inline>
          </CardBody>
        </Card>
      </Stack>
    </Stack>
  );
};

const MenuDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [tab, setTab] = useState<'tasks' | 'stats' | 'settings'>('tasks');
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent side="right" size="md">
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <Box padding="4">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as typeof tab)}
            variant="soft"
            colorScheme="accent"
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
              <Box paddingTop="4">
                <TaskList />
              </Box>
            </TabsContent>
            <TabsContent value="stats">
              <Box paddingTop="4">
                <Stats />
              </Box>
            </TabsContent>
            <TabsContent value="settings">
              <Box paddingTop="4">
                <Settings />
              </Box>
            </TabsContent>
          </Tabs>
        </Box>
      </DrawerContent>
    </Drawer>
  );
};

const Main: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Container size="md">
          <Stack gap="4">
            <Inline justify="end">
              <Button
                variant="soft"
                colorScheme="neutral"
                size="sm"
                leftIcon={<Menu size={16} />}
                onClick={() => setMenuOpen(true)}
              >
                Menu
              </Button>
            </Inline>
            <Center>
              <Box width="full">
                <Timer />
              </Box>
            </Center>
          </Stack>
          <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
        </Container>
      </PersistGate>
    </Provider>
  );
};

export default Main;
