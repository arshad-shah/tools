import React, { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';

type TimeUnit = 'minutes' | 'hours' | 'days' | 'months' | 'years';
type Operation = 'add' | 'subtract';
type TabType = 'difference' | 'modify';

const DateCalculator: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [result, setResult] = useState<string>('');
  
  const [baseDate, setBaseDate] = useState<string>('');
  const [timeValue, setTimeValue] = useState<string>('');
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('days');
  const [operation, setOperation] = useState<Operation>('add');
  const [modifiedResult, setModifiedResult] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState<TabType>('difference');

  const calculateDifference = (): void => {
    if (!startDate || !endDate) {
      setResult('Please select both dates');
      return;
    }

    const start: Date = new Date(startDate);
    const end: Date = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setResult('Invalid date format');
      return;
    }

    const diffTime: number = Math.abs(end.getTime() - start.getTime());
    const diffDays: number = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths: number = Math.floor(diffDays / 30);
    const diffYears: number = Math.floor(diffDays / 365);
    
    const hours: number = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes: number = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

    setResult(`${diffYears} years, ${diffMonths % 12} months, ${diffDays % 30} days, ${hours} hours, ${minutes} minutes`);
  };

  const modifyDate = (): void => {
    if (!baseDate || !timeValue) {
      setModifiedResult('Please provide a date and time value');
      return;
    }

    const date: Date = new Date(baseDate);
    
    if (isNaN(date.getTime())) {
      setModifiedResult('Invalid date format');
      return;
    }

    const value: number = parseInt(timeValue, 10);
    
    if (isNaN(value)) {
      setModifiedResult('Invalid time value');
      return;
    }

    const newDate: Date = new Date(date);
    const multiplier = operation === 'add' ? 1 : -1;

    switch (timeUnit) {
      case 'minutes':
        newDate.setMinutes(date.getMinutes() + (value * multiplier));
        break;
      case 'hours':
        newDate.setHours(date.getHours() + (value * multiplier));
        break;
      case 'days':
        newDate.setDate(date.getDate() + (value * multiplier));
        break;
      case 'months':
        newDate.setMonth(date.getMonth() + (value * multiplier));
        break;
      case 'years':
        newDate.setFullYear(date.getFullYear() + (value * multiplier));
        break;
      default:
        setModifiedResult('Invalid time unit');
        return;
    }

    setModifiedResult(`${newDate.toLocaleString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('difference')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
                activeTab === 'difference' 
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50' 
                  : 'text-slate-600 hover:text-green-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-center items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Date Difference</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('modify')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
                activeTab === 'modify' 
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50' 
                  : 'text-slate-600 hover:text-green-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-center items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add/Subtract Time</span>
              </div>
            </button>
          </div>
          
          {/* Date Difference Tab */}
          {activeTab === 'difference' && (
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
                  />
                </div>
                
                <button
                  onClick={calculateDifference}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-xl transition-all hover:shadow-lg"
                >
                  Calculate Difference
                </button>
              </div>
              
              {result && (
                <div className={`p-4 rounded-xl ${
                  result.includes('Please') || result.includes('Invalid') 
                    ? 'bg-red-50 border border-red-200 text-red-700' 
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  <div className="font-medium">{result}</div>
                </div>
              )}
            </div>
          )}
          
          {/* Add/Subtract Time Tab */}
          {activeTab === 'modify' && (
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Base Date</label>
                  <input
                    type="datetime-local"
                    value={baseDate}
                    onChange={(e) => setBaseDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Operation</label>
                    <select
                      value={operation}
                      onChange={(e) => setOperation(e.target.value as Operation)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
                    >
                      <option value="add">Add</option>
                      <option value="subtract">Subtract</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Value</label>
                    <input
                      type="number"
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      min="0"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                    <select
                      value={timeUnit}
                      onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={modifyDate}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-xl transition-all hover:shadow-lg"
                >
                  Calculate New Date
                </button>
              </div>
              
              {modifiedResult && (
                <div className={`p-4 rounded-xl ${
                  modifiedResult.includes('Please') || modifiedResult.includes('Invalid') 
                    ? 'bg-red-50 border border-red-200 text-red-700' 
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  <div className="font-medium">{modifiedResult}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateCalculator;