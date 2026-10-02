import React from 'react';
import {
  IconAward,
  IconBarChart2,
  IconCalendar,
  IconClock,
  IconFlame,
  IconSparkles,
  IconTarget,
  IconTrendingUp,
} from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  Heading,
  Inline,
  Progress,
  Stack,
  Text,
} from '@/shared/ui';
import { usePomodoroStore } from '../store';
import {
  DAILY_GOAL,
  averageDaily,
  focusScore,
  progressToGoal,
  timePeriod,
} from '../lib/stats';

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
}> = ({ icon, label, value, subtext }) => (
  <Card>
    <CardBody>
      <Stack gap="1">
        <Inline gap="2" align="center">
          {icon}
          <Text size="xs" tone="subtle">
            {label}
          </Text>
        </Inline>
        <Heading level={4} size="xl">
          {value}
        </Heading>
        {subtext && (
          <Text size="xs" tone="subtle">
            {subtext}
          </Text>
        )}
      </Stack>
    </CardBody>
  </Card>
);

export const StatsPanel: React.FC = () => {
  const stats = usePomodoroStore((s) => s.stats);
  const workDuration = usePomodoroStore((s) => s.settings.workDuration);

  const progress = progressToGoal(stats);
  const totalHours = Math.floor(stats.totalFocusTime / 60);
  const totalMinutes = stats.totalFocusTime % 60;
  const period = timePeriod(new Date().getHours());

  return (
    <Stack gap="6">
      <Inline justify="between" align="center" wrap>
        <Inline align="center" gap="2">
          <IconBarChart2 size="lg" />
          <Heading level={3} size="md">
            Statistics
          </Heading>
        </Inline>
        <Badge
          variant="soft"
          tone="accent"
          size="sm"
          icon={<IconSparkles size="xs" />}
        >
          Good {period}!
        </Badge>
      </Inline>

      <Card>
        <CardHeader>
          <Inline justify="between" align="center" wrap>
            <Inline align="center" gap="2">
              <IconTarget size="md" />
              <CardTitle as="h4">Daily progress</CardTitle>
            </Inline>
            <Badge variant="soft" tone="accent" size="sm">
              {stats.dailyPomodoros} / {DAILY_GOAL} pomodoros
            </Badge>
          </Inline>
        </CardHeader>
        <CardBody>
          <Stack gap="2">
            <Progress value={progress} max={100} />
            <Text size="sm" tone="subtle">
              {progress >= 100
                ? 'Daily goal achieved — outstanding work!'
                : `${DAILY_GOAL - stats.dailyPomodoros} pomodoros to reach your goal`}
            </Text>
          </Stack>
        </CardBody>
      </Card>

      <Grid max={2} gap="3">
        <StatTile
          icon={<IconTarget size="sm" />}
          label="Today's focus"
          value={stats.dailyPomodoros}
          subtext={`${workDuration * stats.dailyPomodoros} mins focused`}
        />
        <StatTile
          icon={<IconCalendar size="sm" />}
          label="Weekly progress"
          value={stats.weeklyPomodoros}
          subtext={`${averageDaily(stats)} daily average`}
        />
        <StatTile
          icon={<IconClock size="sm" />}
          label="Total focus time"
          value={`${totalHours}h ${totalMinutes}m`}
        />
        <StatTile
          icon={<IconFlame size="sm" />}
          label="Current streak"
          value={`${stats.currentStreak} days`}
        />
      </Grid>

      <Card>
        <CardBody>
          <Inline justify="between" align="center" wrap>
            <Inline align="center" gap="2">
              <IconAward size="lg" />
              <Heading level={4} size="md">
                Focus score
              </Heading>
            </Inline>
            <Heading level={4} size="3xl">
              {focusScore(stats)}
            </Heading>
          </Inline>
          <Text size="sm" tone="subtle" className="pt-2">
            Based on your daily progress, streak, and weekly performance.
          </Text>
        </CardBody>
      </Card>

      {stats.weeklyPomodoros > 0 && (
        <Alert status="info" icon={<IconTrendingUp />}>
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
