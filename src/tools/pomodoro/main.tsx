import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { Timer } from './components/Timer';
import { TaskList } from './components/TaskList';
import { Stats } from './components/Stats';
import { Settings } from './components/Settings';
import { Menu, X, BarChart2, ListTodo, Settings2 } from 'lucide-react';
import { Button } from '../../components/Button';
const MenuPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats' | 'settings'>('tasks');

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full sm:w-[400px] lg:w-[500px] bg-white/90 backdrop-blur-xl 
                  shadow-2xl transform transition-transform duration-300 ease-in-out z-50
                  ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Panel Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-around p-4 border-b border-gray-100">
        <Button
          variant="ghost"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors
                     ${activeTab === 'tasks' 
                       ? 'bg-violet-100 text-violet-600' 
                       : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ListTodo className="w-5 h-5" />
          <span>Tasks</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab('stats')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors
                     ${activeTab === 'stats' 
                       ? 'bg-violet-100 text-violet-600' 
                       : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <BarChart2 className="w-5 h-5" />
          <span>Stats</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors
                     ${activeTab === 'settings' 
                       ? 'bg-violet-100 text-violet-600' 
                       : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Settings2 className="w-5 h-5" />
          <span>Settings</span>
        </Button>
      </div>

      {/* Panel Content */}
      <div className="h-[calc(100vh-120px)] overflow-y-auto p-6">
        {activeTab === 'tasks' && <TaskList />}
        {activeTab === 'stats' && <Stats />}
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  );
};

function Main() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
          {/* Menu Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(true)}
            className="fixed top-6 right-6 z-50 bg-white/80 backdrop-blur-sm shadow-lg 
                     hover:bg-violet-50 rounded-full w-12 h-12"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </Button>

          {/* Main Content */}
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-2xl mx-auto">
              <Timer />
            </div>
          </div>

          {/* Menu Panel */}
          <MenuPanel isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

          {/* Overlay */}
          {isMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsMenuOpen(false)}
            />
          )}
        </div>
      </PersistGate>
    </Provider>
  );
}

export default Main;