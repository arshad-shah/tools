import { useAppSelector, useAppDispatch } from '../hook';
import { ListTodo, CheckCircle2, Circle } from 'lucide-react';
import { setCurrentTask } from '../store';
import { Button } from '../../../components/Button';
interface Task {
  id: string;
  title: string;
  completed: boolean;
  pomodoros: number;
  completedPomodoros: number;
}

const CurrentTask = () =>{
  const currentTaskId = useAppSelector((state: { timer: { currentTask: string | null } }) => state.timer.currentTask);
  const tasks = useAppSelector((state: { tasks: Task[] }) => state.tasks);
  const currentTask = tasks.find((task: Task) => task.id === currentTaskId);
  const dispatch = useAppDispatch();

  if (!currentTask) {
    const nextTask = tasks.find((task: Task) => !task.completed);
    
    if (!nextTask) {
      return (
        <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="text-gray-400 flex items-center justify-center mb-2">
            <ListTodo className="w-5 h-5 mr-2" />
            <span>No active task</span>
          </div>
          <p className="text-sm text-gray-500">
            Add tasks from the menu to get started
          </p>
        </div>
      );
    }

    return (
      <div className="text-center p-4 bg-violet-50 rounded-xl border border-violet-100">
        <div className="text-violet-600 flex items-center justify-center mb-2">
          <ListTodo className="w-5 h-5 mr-2" />
          <span>Start working on:</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-gray-700 font-medium">{nextTask.title}</span>
          <Button
            size="sm"
            onClick={() => dispatch(setCurrentTask(nextTask.id))}
            className="bg-violet-500 hover:bg-violet-600 text-white"
          >
            Start Task
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {currentTask.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" />
          )}
          <span className="font-medium text-gray-800">{currentTask.title}</span>
        </div>
        <div className="text-sm px-3 py-1 bg-violet-50 text-violet-600 rounded-full">
          {currentTask.completedPomodoros}/{currentTask.pomodoros} pomodoros
        </div>
      </div>
    </div>
  );
};

export default CurrentTask;