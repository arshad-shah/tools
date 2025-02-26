import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../hook';
import { addTask, updateTask, deleteTask } from '../store';
import { 
  Plus,
  ListTodo
} from 'lucide-react';
import { Input } from '../../../components/input';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/utils';
import { Alert} from '../../../components/Alert';
import TaskItem from './TaskItem';
import { Task } from '../../../types/PomodoroTypes';

export const TaskList: React.FC = () => {
  const tasks = useAppSelector(state => state.tasks);
  const dispatch = useAppDispatch();
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      dispatch(addTask({
        title: newTaskTitle.trim(),
        completed: false,
        pomodoros: 1,
        completedPomodoros: 0,
      }));
      setNewTaskTitle('');
    }
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    dispatch(updateTask({ id, updates }));
  };

  return (
    <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-lg 
                    rounded-xl shadow-xl p-4 sm:p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-violet-100 text-violet-600">
            <ListTodo className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            Tasks for Today
          </h2>
        </div>
        
        {tasks.length > 0 && (
          <div className="text-sm text-gray-500">
            {tasks.filter(t => t.completed).length}/{tasks.length} completed
          </div>
        )}
      </div>
      
      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="flex gap-2 sm:gap-3 mb-6">
        <Input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          className={cn(
            "flex-1 h-10 sm:h-12 rounded-xl border-gray-200",
            "bg-white/50 backdrop-blur-sm",
            "focus:ring-2 focus:ring-violet-500 focus:border-violet-500",
            "placeholder:text-gray-400 text-gray-600",
            "transition-all duration-200"
          )}
        />
        <Button 
          type="submit"
          disabled={!newTaskTitle.trim()}
          className={cn(
            "h-10 sm:h-12 px-3 sm:px-4",
            "bg-violet-500 hover:bg-violet-600 text-white rounded-xl",
            "shadow-lg shadow-violet-200/50 transition-all duration-200",
            "hover:shadow-xl hover:shadow-violet-200/60 hover:-translate-y-0.5",
            "disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </form>

      {/* Task List */}
      <div className="space-y-2 sm:space-y-3">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onUpdate={(updates) => handleUpdateTask(task.id, updates)}
            onDelete={() => dispatch(deleteTask(task.id))}
          />
        ))}
        
        {tasks.length === 0 && (
          <Alert className="bg-white text-gray-500 border border-gray-100" title="No tasks found">
            Add a new task using the form above
          </Alert>
        )}
      </div>
    </div>
  );
};

export default TaskList;