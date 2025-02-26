import StatsCard from './StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/Card';
import { Progress } from '../../../components/progress';
import { useAppSelector } from '../hook';
import { BarChart2, Target, Clock, Flame, Calendar, TrendingUp, Award, Sparkles } from 'lucide-react';



export const Stats = () => {
  const stats = useAppSelector(state => state.stats);
  const settings = useAppSelector(state => state.settings);
  const dailyGoal = 8;

  const progressToGoal = (stats.dailyPomodoros / dailyGoal) * 100;
  const totalHours = Math.floor(stats.totalFocusTime / 60);
  const totalMinutes = stats.totalFocusTime % 60;
  const averageDaily = stats.currentStreak > 0 
    ? (stats.weeklyPomodoros / Math.min(stats.currentStreak, 7)).toFixed(1) 
    : '0';

  const getTimePeriod = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const calculateFocusScore = () => {
    const dailyProgress = (stats.dailyPomodoros / dailyGoal) * 100;
    const streakBonus = Math.min(stats.currentStreak * 5, 25);
    const weeklyBonus = Math.min(stats.weeklyPomodoros, 50);
    return Math.min(Math.floor(dailyProgress + streakBonus + weeklyBonus), 100);
  };

  return (
    <Card className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-lg border-0 shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-violet-100 text-violet-500">
              <BarChart2 className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-800">Statistics</CardTitle>
          </div>
          <div className="text-sm bg-violet-50 text-violet-600 px-4 py-2 rounded-full flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            Good {getTimePeriod()}!
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        {/* Daily Progress */}
        <div className="bg-white rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-violet-500" />
              <span className="font-medium text-gray-800">Daily Progress</span>
            </div>
            <span className="text-sm px-3 py-1 bg-violet-50 text-violet-600 rounded-full">
              {stats.dailyPomodoros} / {dailyGoal} pomodoros
            </span>
          </div>
          <Progress 
            value={progressToGoal} 
            className="h-3 rounded-full bg-violet-100"
          />
          <p className="text-sm text-gray-500 flex items-center">
            {progressToGoal >= 100 ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
                Daily goal achieved! Outstanding work!
              </>
            ) : (
              `${dailyGoal - stats.dailyPomodoros} pomodoros to reach your daily goal`
            )}
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            icon={Target} 
            label="Today's Focus" 
            value={stats.dailyPomodoros}
            subtext={`${settings.workDuration * stats.dailyPomodoros} mins focused`}
          />
          <StatsCard 
            icon={Calendar} 
            label="Weekly Progress" 
            value={stats.weeklyPomodoros}
            subtext={`${averageDaily} daily average`}
          />
          <StatsCard 
            icon={Clock} 
            label="Total Focus Time" 
            value={`${totalHours}h ${totalMinutes}m`}
          />
          <StatsCard 
            icon={Flame} 
            label="Current Streak" 
            value={`${stats.currentStreak} days`}
          />
        </div>

        {/* Focus Score */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-fuchsia-500 p-6 rounded-xl text-white">
          <div className="absolute top-0 right-0 opacity-10">
            <Award className="w-32 h-32 -mt-6 -mr-6" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">Focus Score</h3>
              </div>
              <span className="text-3xl font-bold">{calculateFocusScore()}</span>
            </div>
            <div className="text-sm text-white/90">
              Based on your daily progress, streak, and weekly performance
            </div>
          </div>
        </div>

        {/* Trending Stats */}
        {stats.weeklyPomodoros > 0 && (
          <div className="flex items-center space-x-3 text-sm bg-violet-50 text-violet-600 p-4 rounded-xl">
            <TrendingUp className="w-5 h-5" />
            <span>
              {stats.weeklyPomodoros > stats.dailyPomodoros * 7 
                ? "You're ahead of last week's pace! 🚀"
                : "Keep pushing to beat last week's record!"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};