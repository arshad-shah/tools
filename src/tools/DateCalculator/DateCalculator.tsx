/* eslint-disable @typescript-eslint/no-unused-expressions */
import React, { useState } from 'react';

// Define types
type TimeUnit = 'minutes' | 'hours' | 'days' | 'months' | 'years';
type Operation = 'add' | 'subtract';
type TabType = 'difference' | 'modify';

const DateCalculator: React.FC = () => {
  // State for date inputs
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [result, setResult] = useState<string>('');
  
  // State for add/subtract time
  const [baseDate, setBaseDate] = useState<string>('');
  const [timeValue, setTimeValue] = useState<string>('');
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('days');
  const [operation, setOperation] = useState<Operation>('add');
  const [modifiedResult, setModifiedResult] = useState<string>('');
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<TabType>('difference');

  // Calculate difference between two dates
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

  // Add or subtract time from a date
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

    switch (timeUnit) {
      case 'minutes':
        operation === 'add' 
          ? newDate.setMinutes(date.getMinutes() + value) 
          : newDate.setMinutes(date.getMinutes() - value);
        break;
      case 'hours':
        operation === 'add' 
          ? newDate.setHours(date.getHours() + value) 
          : newDate.setHours(date.getHours() - value);
        break;
      case 'days':
        operation === 'add' 
          ? newDate.setDate(date.getDate() + value) 
          : newDate.setDate(date.getDate() - value);
        break;
      case 'months':
        operation === 'add' 
          ? newDate.setMonth(date.getMonth() + value) 
          : newDate.setMonth(date.getMonth() - value);
        break;
      case 'years':
        operation === 'add' 
          ? newDate.setFullYear(date.getFullYear() + value) 
          : newDate.setFullYear(date.getFullYear() - value);
        break;
      default:
        setModifiedResult('Invalid time unit');
        return;
    }

    setModifiedResult(`${newDate.toLocaleString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 flex justify-center items-center">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
          <h1 className="text-3xl font-bold text-white text-center">Chrono Calculator</h1>
          <p className="text-green-100 text-center mt-2">Calculate time differences & manipulate dates with ease</p>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('difference')}
            className={`flex-1 py-4 px-6 text-center font-medium text-sm focus:outline-none ${
              activeTab === 'difference' 
                ? 'text-green-600 border-b-2 border-green-500 bg-green-50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex justify-center items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Time Between Dates
            </span>
          </button>
          <button
            onClick={() => setActiveTab('modify')}
            className={`flex-1 py-4 px-6 text-center font-medium text-sm focus:outline-none ${
              activeTab === 'modify' 
                ? 'text-green-600 border-b-2 border-green-500 bg-green-50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex justify-center items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Add/Subtract Time
            </span>
          </button>
        </div>
        
        {/* Calculate difference between dates */}
        {activeTab === 'difference' && (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  />
                </div>
              </div>
              
              <button
                onClick={calculateDifference}
                className="mt-2 w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transform transition-all duration-200 hover:-translate-y-0.5"
              >
                Calculate Time Difference
              </button>
            </div>
            
            {result && (
              <div className="mt-6 animate-fade-in">
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-5">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Time Difference</h3>
                      <div className="mt-2 text-lg font-medium text-green-700">
                        {result}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Add or subtract time */}
        {activeTab === 'modify' && (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Date & Time</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="datetime-local"
                    value={baseDate}
                    onChange={(e) => setBaseDate(e.target.value)}
                    className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
                  <select
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as Operation)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  >
                    <option value="add">Add</option>
                    <option value="subtract">Subtract</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <input
                    type="number"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    min="0"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
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
                className="mt-2 w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-3 px-4 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transform transition-all duration-200 hover:-translate-y-0.5"
              >
                Calculate New Date
              </button>
            </div>
            
            {modifiedResult && (
              <div className="mt-6 animate-fade-in">
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-5">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Result Date & Time</h3>
                      <div className="mt-2 text-lg font-medium text-green-700">
                        {modifiedResult}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
    
      </div>
    </div>
  );
};

export default DateCalculator;