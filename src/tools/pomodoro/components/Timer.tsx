// Timer.tsx (main component)
import React, { useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../hook';
import { updateTimer, updateStats, updateTask } from '../store';
import { Card, CardContent } from '../../../components/Card';
import { cn } from '../../../lib/utils';
import ModeSelector from './ModeSelector';
import CurrentTask from './CurrentTask';
import { TimerDisplay } from './TimerDisplay';
import { TimerProgress } from './TimerProgress';
import { TimerControls } from './TimerControls';
import { TimerHeader } from './TimerHeader';
import { TIMER_THEMES } from './constants';
import { AUDIO_BASE_64 } from '../Audio';
import usePomodoroTimer from '../hooks/usePomodoro';

export const Timer: React.FC = () => {
  const timer = useAppSelector(state => {
    const { mode, timeLeft, isActive, currentTask } = state.timer;
    return { mode, timeLeft, isActive, currentTask: currentTask ?? null };
  });
  const settings = useAppSelector(state => state.settings);
  const stats = useAppSelector(state => state.stats);
  const currentTask = useAppSelector(state => 
    state.tasks.find(task => task.id === timer.currentTask)
  );

  const dispatch = useAppDispatch();
  const currentTheme = TIMER_THEMES[timer.mode];

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getCurrentDuration = useCallback((): number => {
    const durations = {
      work: settings.workDuration,
      shortBreak: settings.shortBreakDuration,
      longBreak: settings.longBreakDuration,
    };
    return durations[timer.mode];
  }, [settings, timer.mode]);

  const progress = useMemo(() => {
    const totalSeconds = getCurrentDuration() * 60;
    return ((totalSeconds - timer.timeLeft) / totalSeconds) * 100;
  }, [getCurrentDuration, timer.timeLeft]);

  const handleTimerComplete = useCallback(() => {
    if (timer.mode === 'work') {
      dispatch(updateStats({
        dailyPomodoros: stats.dailyPomodoros + 1,
        weeklyPomodoros: stats.weeklyPomodoros + 1,
        totalFocusTime: stats.totalFocusTime + settings.workDuration
      }));
      
      dispatch(updateTimer({
        mode: 'shortBreak',
        timeLeft: settings.shortBreakDuration * 60,
        isActive: settings.autoStartBreaks
      }));
    } else {
      dispatch(updateTimer({
        mode: 'work',
        timeLeft: settings.workDuration * 60,
        isActive: settings.autoStartPomodoros
      }));
    }
    if (currentTask) {
      const newCompletedPomodoros = currentTask.completedPomodoros + 1;
      dispatch(updateTask({
        id: currentTask.id,
        updates: {
          completedPomodoros: newCompletedPomodoros,
          completed: newCompletedPomodoros >= currentTask.pomodoros
        }
      }));
    }

    if (settings.soundEnabled) {
      try {
        const audio = new Audio(AUDIO_BASE_64);
        audio.play();
        audio.play().catch(console.error);
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }
  }, [timer.mode, settings, stats, dispatch, currentTask]);

  usePomodoroTimer({ timer, handleTimerComplete, formatTime });

  const handleTimerToggle = () => {
    if (!timer.isActive && timer.mode === 'work' && !timer.currentTask) {
      return;
    }
    dispatch(updateTimer({ isActive: !timer.isActive }));
  };

  return (
    <Card className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-lg border-0 shadow-xl">
      <CardContent className="pt-6 sm:pt-8 px-4 sm:px-6 pb-6 sm:pb-8">
        <ModeSelector 
          currentMode={timer.mode} 
          onModeChange={(mode) => {
            dispatch(updateTimer({ 
              mode, 
              timeLeft: settings[`${mode}Duration`] * 60,
              isActive: false,
            }));
          }}
        />
        
        {timer.mode === 'work' && (
          <div className="mt-6 sm:mt-8">
            <CurrentTask />
          </div>
        )}

        <div className="mt-6 sm:mt-8 relative overflow-hidden">
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-5 rounded-2xl sm:rounded-3xl",
            currentTheme.gradient
          )} />
          
          <div className="relative text-center py-8 sm:py-12 px-4 sm:px-6 rounded-2xl sm:rounded-3xl">
            <TimerHeader 
              mode={timer.mode}
              theme={currentTheme}
              dailyPomodoros={stats.dailyPomodoros}
              currentTask={currentTask}
            />

            <TimerDisplay 
              timeLeft={timer.timeLeft}
              progress={progress}
              formatTime={formatTime}
            />

            <TimerProgress 
              progress={progress}
              progressColor={currentTheme.progressColor}
            />

            <TimerControls 
              isActive={timer.isActive}
              theme={currentTheme}
              onToggle={handleTimerToggle}
              onReset={() => dispatch(updateTimer({
                timeLeft: getCurrentDuration() * 60,
                isActive: false,
              }))}
              onSkip={handleTimerComplete}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};