import React from 'react';
import { Label } from '../../../components/label';
import { Switch } from '../../../components/Switch';
import { Slider } from '../../../components/Slider';
import { useAppSelector, useAppDispatch } from '../hook';
import { updateSettings } from '../store';
import { Settings2, Clock, PlayCircle, Timer, Coffee, Battery } from 'lucide-react';

export const Settings: React.FC = () => {
  const settings = useAppSelector(state => state.settings);
  const dispatch = useAppDispatch();

  const handleSettingUpdate = (update: Partial<typeof settings>) => {
    dispatch(updateSettings(update));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-violet-100 text-violet-600">
            <Settings2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Settings</h2>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Timer Durations */}
        <section className="space-y-6">
          <h3 className="font-medium text-gray-800 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-violet-600" />
            <span>Timer Durations</span>
          </h3>

          <div className="space-y-6">
            {/* Work Duration */}
            <div className="group bg-gray-50 p-4 rounded-lg border border-gray-100 
                          hover:bg-white hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-violet-600" />
                  <Label className="font-medium text-gray-800">Work Duration</Label>
                </div>
                <span className="text-sm font-medium px-3 py-1 bg-violet-100 text-violet-600 
                               rounded-full shadow-sm">
                  {settings.workDuration} minutes
                </span>
              </div>
              <Slider
                variant="violet"
                showLabels
                value={[settings.workDuration]}
                onValueChange={([value]) => handleSettingUpdate({ workDuration: value })}
                min={1}
                max={60}
                step={1}
                className="pt-2"
              />
            </div>

            {/* Short Break */}
            <div className="group bg-gray-50 p-4 rounded-lg border border-gray-100 
                          hover:bg-white hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Coffee className="w-4 h-4 text-blue-600" />
                  <Label className="font-medium text-gray-800">Short Break</Label>
                </div>
                <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-600 
                               rounded-full shadow-sm">
                  {settings.shortBreakDuration} minutes
                </span>
              </div>
              <Slider
                variant="blue"
                showLabels
                value={[settings.shortBreakDuration]}
                onValueChange={([value]) => handleSettingUpdate({ shortBreakDuration: value })}
                min={1}
                max={30}
                step={1}
                className="pt-2"
              />
            </div>

            {/* Long Break */}
            <div className="group bg-gray-50 p-4 rounded-lg border border-gray-100 
                          hover:bg-white hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Battery className="w-4 h-4 text-green-600" />
                  <Label className="font-medium text-gray-800">Long Break</Label>
                </div>
                <span className="text-sm font-medium px-3 py-1 bg-green-100 text-green-600 
                               rounded-full shadow-sm">
                  {settings.longBreakDuration} minutes
                </span>
              </div>
              <Slider
                variant="green"
                showLabels
                value={[settings.longBreakDuration]}
                onValueChange={([value]) => handleSettingUpdate({ longBreakDuration: value })}
                min={5}
                max={45}
                step={5}
                className="pt-2"
              />
            </div>
          </div>
        </section>

        {/* Auto-start Options */}
        <section className="space-y-4">
          <h3 className="font-medium text-gray-800 flex items-center space-x-2 mb-6">
            <PlayCircle className="w-5 h-5 text-violet-600" />
            <span>Automation</span>
          </h3>

          <div className="space-y-4">
            {/* Auto-start Breaks */}
            <div className="group bg-gray-50 p-4 rounded-lg border border-gray-100 
                          hover:bg-white hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-breaks" className="font-medium text-gray-800">
                    Auto-start Breaks
                  </Label>
                  <p className="text-sm text-gray-600">
                    Automatically begin breaks when work sessions end
                  </p>
                </div>
                <Switch
                  id="auto-breaks"
                  variant="violet"
                  size="lg"
                  checked={settings.autoStartBreaks}
                  onCheckedChange={(checked) => handleSettingUpdate({ autoStartBreaks: checked })}
                />
              </div>
            </div>

            {/* Auto-start Pomodoros */}
            <div className="group bg-gray-50 p-4 rounded-lg border border-gray-100 
                          hover:bg-white hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-pomodoros" className="font-medium text-gray-800">
                    Auto-start Pomodoros
                  </Label>
                  <p className="text-sm text-gray-600">
                    Automatically begin new work sessions after breaks
                  </p>
                </div>
                <Switch
                  id="auto-pomodoros"
                  variant="violet"
                  size="lg"
                  checked={settings.autoStartPomodoros}
                  onCheckedChange={(checked) => handleSettingUpdate({ autoStartPomodoros: checked })}
                />
              </div>
            </div>

            {/* Sound Notifications */}
            <div className="group bg-gray-50 p-4 rounded-lg border border-gray-100 
                          hover:bg-white hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sound-enabled" className="font-medium text-gray-800">
                    Sound Notifications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Play a sound when timer completes
                  </p>
                </div>
                <Switch
                  id="sound-enabled"
                  variant="violet"
                  size="lg"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => handleSettingUpdate({ soundEnabled: checked })}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};