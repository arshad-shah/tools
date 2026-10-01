import React from 'react';
import {
  Award,
  BarChart2,
  Calendar,
  Clock,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
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
          <BarChart2 size={20} aria-hidden />
          <Heading level={3} size="md">
            Statistics
          </Heading>
        </Inline>
        <Badge
          variant="soft"
          tone="accent"
          size="sm"
          icon={<Sparkles size={12} aria-hidden />}
        >
          Good {period}!
        </Badge>
      </Inline>

      <Card>
        <CardHeader>
          <Inline justify="between" align="center" wrap>
            <Inline align="center" gap="2">
              <Target size={18} aria-hidden />
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
          icon={<Target size={16} aria-hidden />}
          label="Today's focus"
          value={stats.dailyPomodoros}
          subtext={`${workDuration * stats.dailyPomodoros} mins focused`}
        />
        <StatTile
          icon={<Calendar size={16} aria-hidden />}
          label="Weekly progress"
          value={stats.weeklyPomodoros}
          subtext={`${averageDaily(stats)} daily average`}
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

      <Card>
        <CardBody>
          <Inline justify="between" align="center" wrap>
            <Inline align="center" gap="2">
              <Award size={20} aria-hidden />
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
        <Alert status="info" icon={<TrendingUp aria-hidden />}>
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
