import {
  Badge,
  Grid,
  Notice,
  ProgressBar,
  Stack,
  Stat,
  Text,
} from '@arshad-shah/cynosure';
import {
  award,
  calendar,
  clock,
  flame,
  sparkles,
  target,
  trendingUp,
} from '@arshad-shah/cynosure/icons';
import React from 'react';
import { usePomodoroStore } from '../store';
import {
  DAILY_GOAL,
  averageDaily,
  focusScore,
  progressToGoal,
  timePeriod,
} from '../lib/stats';

export const StatsPanel: React.FC = () => {
  const stats = usePomodoroStore((s) => s.stats);
  const workDuration = usePomodoroStore((s) => s.settings.workDuration);

  const progress = progressToGoal(stats);
  const totalHours = Math.floor(stats.totalFocusTime / 60);
  const totalMinutes = stats.totalFocusTime % 60;
  const period = timePeriod(new Date().getHours());

  return (
    <Stack gap="6">
      <Stack gap="3">
        <Badge tone="accent" icon={sparkles}>
          {`Good ${period}!`}
        </Badge>
        <ProgressBar
          label={`Daily goal: ${stats.dailyPomodoros} of ${DAILY_GOAL} pomodoros`}
          value={progress}
          showValue
        />
        <Text size="sm" tone="muted">
          {progress >= 100
            ? 'Daily goal achieved: outstanding work!'
            : `${DAILY_GOAL - stats.dailyPomodoros} pomodoros to reach your goal`}
        </Text>
      </Stack>

      <Grid columns={2} gap="3">
        <Stat
          icon={target}
          label="Today's focus"
          value={stats.dailyPomodoros}
          description={`${workDuration * stats.dailyPomodoros} mins focused`}
          variant="soft"
          size="sm"
        />
        <Stat
          icon={calendar}
          label="Weekly progress"
          value={stats.weeklyPomodoros}
          description={`${averageDaily(stats)} daily average`}
          variant="soft"
          size="sm"
        />
        <Stat
          icon={clock}
          label="Total focus time"
          value={`${totalHours}h ${totalMinutes}m`}
          variant="soft"
          size="sm"
        />
        <Stat
          icon={flame}
          label="Current streak"
          value={`${stats.currentStreak} days`}
          variant="soft"
          size="sm"
        />
      </Grid>

      <Stat
        icon={award}
        label="Focus score"
        value={focusScore(stats)}
        description="Based on your daily progress, streak, and weekly performance."
        variant="outline"
      />

      {stats.weeklyPomodoros > 0 ? (
        <Notice tone="info" icon={trendingUp}>
          {stats.weeklyPomodoros > stats.dailyPomodoros * 7
            ? "You're ahead of last week's pace!"
            : "Keep pushing to beat last week's record!"}
        </Notice>
      ) : null}
    </Stack>
  );
};
