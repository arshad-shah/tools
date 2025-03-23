import React, { useState, useEffect, ChangeEvent } from 'react';
import { 
  ArrowRightLeft, 
  X, 
  Clock, 
  Zap, 
  History,
  Ruler, 
  Scale, 
  Droplet, 
  Thermometer, 
  Square, 
  Timer, 
  HardDrive, 
  Gauge, 
  Battery,
  Search,
  RefreshCw
} from 'lucide-react';
import { Category, Conversion, Unit } from '../../types/UnitConverterTypes';

const UnitConverter: React.FC = () => {
  // Categories with their units and conversion factors (to base unit)
  const categories: Category[] = [
    {
      name: 'Length',
      icon: <Ruler className="text-white" />,
      baseUnit: 'meters',
      units: [
        { name: 'Kilometers', symbol: 'km', factor: 1000 },
        { name: 'Meters', symbol: 'm', factor: 1 },
        { name: 'Centimeters', symbol: 'cm', factor: 0.01 },
        { name: 'Millimeters', symbol: 'mm', factor: 0.001 },
        { name: 'Miles', symbol: 'mi', factor: 1609.34 },
        { name: 'Yards', symbol: 'yd', factor: 0.9144 },
        { name: 'Feet', symbol: 'ft', factor: 0.3048 },
        { name: 'Inches', symbol: 'in', factor: 0.0254 },
      ]
    },
    {
      name: 'Weight',
      icon: <Scale className="text-white" />,
      baseUnit: 'grams',
      units: [
        { name: 'Tonnes', symbol: 't', factor: 1000000 },
        { name: 'Kilograms', symbol: 'kg', factor: 1000 },
        { name: 'Grams', symbol: 'g', factor: 1 },
        { name: 'Milligrams', symbol: 'mg', factor: 0.001 },
        { name: 'Pounds', symbol: 'lb', factor: 453.592 },
        { name: 'Ounces', symbol: 'oz', factor: 28.3495 },
      ]
    },
    {
      name: 'Volume',
      icon: <Droplet className="text-white" />,
      baseUnit: 'liters',
      units: [
        { name: 'Cubic Meters', symbol: 'm³', factor: 1000 },
        { name: 'Liters', symbol: 'L', factor: 1 },
        { name: 'Milliliters', symbol: 'mL', factor: 0.001 },
        { name: 'Gallons (US)', symbol: 'gal', factor: 3.78541 },
        { name: 'Quarts', symbol: 'qt', factor: 0.946353 },
        { name: 'Pints', symbol: 'pt', factor: 0.473176 },
        { name: 'Cups', symbol: 'cup', factor: 0.236588 },
        { name: 'Fluid Ounces', symbol: 'fl oz', factor: 0.0295735 },
      ]
    },
    {
      name: 'Temperature',
      icon: <Thermometer className="text-white" />,
      baseUnit: 'kelvin',
      units: [
        { name: 'Kelvin', symbol: 'K', factor: 1 },
        { name: 'Celsius', symbol: '°C', factor: 1, offset: 273.15 },
        { name: 'Fahrenheit', symbol: '°F', factor: 5/9, offset: 459.67 },
      ]
    },
    {
      name: 'Area',
      icon: <Square className="text-white" />,
      baseUnit: 'square meters',
      units: [
        { name: 'Square Kilometers', symbol: 'km²', factor: 1000000 },
        { name: 'Hectares', symbol: 'ha', factor: 10000 },
        { name: 'Square Meters', symbol: 'm²', factor: 1 },
        { name: 'Square Miles', symbol: 'mi²', factor: 2589988.11 },
        { name: 'Acres', symbol: 'ac', factor: 4046.86 },
        { name: 'Square Feet', symbol: 'ft²', factor: 0.092903 },
        { name: 'Square Inches', symbol: 'in²', factor: 0.00064516 },
      ]
    },
    {
      name: 'Speed',
      icon: <Zap className="text-white" />,
      baseUnit: 'meters per second',
      units: [
        { name: 'Meters per Second', symbol: 'm/s', factor: 1 },
        { name: 'Kilometers per Hour', symbol: 'km/h', factor: 0.277778 },
        { name: 'Miles per Hour', symbol: 'mph', factor: 0.44704 },
        { name: 'Knots', symbol: 'kn', factor: 0.514444 },
        { name: 'Feet per Second', symbol: 'ft/s', factor: 0.3048 },
      ]
    },
    {
      name: 'Time',
      icon: <Timer className="text-white" />,
      baseUnit: 'seconds',
      units: [
        { name: 'Years', symbol: 'yr', factor: 31536000 },
        { name: 'Months', symbol: 'mo', factor: 2628000 },
        { name: 'Weeks', symbol: 'wk', factor: 604800 },
        { name: 'Days', symbol: 'd', factor: 86400 },
        { name: 'Hours', symbol: 'h', factor: 3600 },
        { name: 'Minutes', symbol: 'min', factor: 60 },
        { name: 'Seconds', symbol: 's', factor: 1 },
        { name: 'Milliseconds', symbol: 'ms', factor: 0.001 },
      ]
    },
    {
      name: 'Data',
      icon: <HardDrive className="text-white" />,
      baseUnit: 'bytes',
      units: [
        { name: 'Terabytes', symbol: 'TB', factor: 1099511627776 },
        { name: 'Gigabytes', symbol: 'GB', factor: 1073741824 },
        { name: 'Megabytes', symbol: 'MB', factor: 1048576 },
        { name: 'Kilobytes', symbol: 'KB', factor: 1024 },
        { name: 'Bytes', symbol: 'B', factor: 1 },
        { name: 'Bits', symbol: 'bit', factor: 0.125 },
      ]
    },
    {
      name: 'Pressure',
      icon: <Gauge className="text-white" />,
      baseUnit: 'pascals',
      units: [
        { name: 'Gigapascals', symbol: 'GPa', factor: 1000000000 },
        { name: 'Megapascals', symbol: 'MPa', factor: 1000000 },
        { name: 'Kilopascals', symbol: 'kPa', factor: 1000 },
        { name: 'Pascals', symbol: 'Pa', factor: 1 },
        { name: 'Bars', symbol: 'bar', factor: 100000 },
        { name: 'Atmospheres', symbol: 'atm', factor: 101325 },
        { name: 'Pounds per Square Inch', symbol: 'psi', factor: 6894.76 },
      ]
    },
    {
      name: 'Energy',
      icon: <Battery className="text-white" />,
      baseUnit: 'joules',
      units: [
        { name: 'Kilojoules', symbol: 'kJ', factor: 1000 },
        { name: 'Joules', symbol: 'J', factor: 1 },
        { name: 'Calories', symbol: 'cal', factor: 4.184 },
        { name: 'Kilocalories', symbol: 'kcal', factor: 4184 },
        { name: 'Watt-hours', symbol: 'Wh', factor: 3600 },
        { name: 'Kilowatt-hours', symbol: 'kWh', factor: 3600000 },
        { name: 'Electron-volts', symbol: 'eV', factor: 1.602177e-19 },
        { name: 'British Thermal Units', symbol: 'BTU', factor: 1055.06 },
      ]
    }
  ];

  // State with TypeScript type annotations
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [fromUnit, setFromUnit] = useState<Unit>(selectedCategory.units[0]);
  const [toUnit, setToUnit] = useState<Unit>(selectedCategory.units[1]);
  const [fromValue, setFromValue] = useState<string>('1');
  const [toValue, setToValue] = useState<string>('');
  const [recentConversions, setRecentConversions] = useState<Conversion[]>([]);
  const [activeTab, setActiveTab] = useState<'converter' | 'saved'>('converter');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Handle category change
  useEffect(() => {
    setFromUnit(selectedCategory.units[0]);
    setToUnit(selectedCategory.units[1]);
  }, [selectedCategory]);

  // Function to convert between units
  const convertUnits = (
    value: string, 
    from: Unit, 
    to: Unit, 
    category: Category
  ): string => {
    if (value === '' || isNaN(parseFloat(value))) return '';
    
    let result: number;
    const inputValue = parseFloat(value);
    
    // Special case for temperature
    if (category.name === 'Temperature') {
      // Convert to Kelvin first
      let kelvin: number;
      if (from.name === 'Celsius') {
        kelvin = inputValue + 273.15;
      } else if (from.name === 'Fahrenheit') {
        kelvin = (inputValue + 459.67) * (5/9);
      } else {
        kelvin = inputValue;
      }
      
      // Convert from Kelvin to target
      if (to.name === 'Celsius') {
        result = kelvin - 273.15;
      } else if (to.name === 'Fahrenheit') {
        result = kelvin * (9/5) - 459.67;
      } else {
        result = kelvin;
      }
    } else {
      // For non-temperature units use simple conversion
      const baseValue = inputValue * from.factor;
      result = baseValue / to.factor;
    }
    
    // Round to a reasonable number of decimal places
    return parseFloat(result.toFixed(10)).toString();
  };

  // When input value or units change, update the output
  useEffect(() => {
    const result = convertUnits(fromValue, fromUnit, toUnit, selectedCategory);
    setToValue(result);
  }, [fromValue, fromUnit, toUnit, selectedCategory]);

  // Add to recent conversions
  const addToRecent = (): void => {
    if (fromValue && toValue) {
      const newConversion: Conversion = {
        id: Date.now(),
        category: selectedCategory.name,
        categoryIcon: selectedCategory.icon,
        from: `${fromValue} ${fromUnit.symbol}`,
        to: `${toValue} ${toUnit.symbol}`,
        fromUnit,
        toUnit,
        fromValue,
        timestamp: new Date(),
      };
      
      setRecentConversions(prev => {
        const updated = [newConversion, ...prev.slice(0, 4)];
        return updated;
      });
    }
  };

  // Swap units
  const swapUnits = (): void => {
    const tempUnit = fromUnit;
    setFromUnit(toUnit);
    setToUnit(tempUnit);
    setFromValue(toValue);
  };

  // Format number with commas for thousands
  const formatNumber = (value: string): string => {
    if (!value || isNaN(parseFloat(value))) return value;
    const parts = value.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Reuse a recent conversion
  const recentConversion = (conversion: Conversion): void => {
    const category = categories.find(cat => cat.name === conversion.category);
    if (category) {
      setSelectedCategory(category);
      setFromUnit(conversion.fromUnit);
      setToUnit(conversion.toUnit);
      setFromValue(conversion.fromValue);
      setActiveTab('converter');
    }
  };

  // Clear a recent conversion
  const clearRecentConversion = (id: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    setRecentConversions(prev => prev.filter(conv => conv.id !== id));
  };

  // Get time since conversion
  const getTimeSince = (timestamp: Date): string => {
    const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Handle unit change
  const handleFromUnitChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const selectedUnit = selectedCategory.units.find(unit => unit.name === e.target.value);
    if (selectedUnit) {
      setFromUnit(selectedUnit);
    }
  };

  // Handle to unit change
  const handleToUnitChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const selectedUnit = selectedCategory.units.find(unit => unit.name === e.target.value);
    if (selectedUnit) {
      setToUnit(selectedUnit);
    }
  };

  // Handle input value change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFromValue(e.target.value);
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
return (
  <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white transition-all duration-300">
    {/* Header with Glass Morphism */}
    <div className="bg-purple-500 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mt-24 -mr-24 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-300 rounded-full -mb-20 -ml-20 blur-3xl"></div>
      </div>
      
      <div className="container mx-auto p-4 relative z-10">
        
        {/* Main Tabs */}
        <div className="flex justify-center align-center items-center">
          <div className="bg-white/10 backdrop-blur-lg p-1 rounded-xl shadow-lg">
            <button
              onClick={() => setActiveTab('converter')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center ${
                activeTab === 'converter' 
                  ? 'bg-white text-purple-600 shadow-lg' 
                  : 'bg-transparent text-white hover:bg-white/20'
              }`}
            >
              <Zap size={18} className="mr-2" />
              Converter
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center ${
                activeTab === 'saved' 
                  ? 'bg-white text-purple-600 shadow-lg' 
                  : 'bg-transparent text-white hover:bg-white/20'
              }`}
            >
              <History size={18} className="mr-2" />
              History
              {recentConversions.length > 0 && (
                <span className="ml-2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {recentConversions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    {/* Main Content */}
    <div className="container mx-auto px-4 py-8 -mt-6">
      <div className="max-w-5xl mx-auto">
        {activeTab === 'converter' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 md:p-8">
            {/* Category Selection */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <h2 className="text-2xl font-bold mb-2 md:mb-0">Select Category</h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full md:w-64"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {filteredCategories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => setSelectedCategory(category)}
                    className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all duration-300 text-center h-28 ${
                      selectedCategory.name === category.name
                        ? 'bg-purple-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 dark:bg-gray-700 hover:shadow hover:bg-purple-100 dark:hover:bg-purple-900/30'
                    }`}
                  >
                    <div className={`p-3 rounded-full mb-2 ${
                      selectedCategory.name === category.name
                        ? 'bg-purple-400/30'
                        : 'bg-purple-100 dark:bg-gray-600'
                    }`}>
                      {category.icon}
                    </div>
                    <span className="text-sm font-medium">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Conversion Card */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* From Unit */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <h3 className="text-lg font-bold">From</h3>
                    <div className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-bold rounded-md">
                      INPUT
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white dark:bg-gray-700 shadow">
                    <select 
                      value={fromUnit.name}
                      onChange={handleFromUnitChange}
                      className="w-full bg-gray-50 dark:bg-gray-600 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 border"
                    >
                      {selectedCategory.units.map(unit => (
                        <option key={unit.name} value={unit.name}>
                          {unit.name} ({unit.symbol})
                        </option>
                      ))}
                    </select>
                    
                    <div className="relative">
                      <input
                        type="text"
                        value={fromValue}
                        onChange={handleInputChange}
                        onBlur={addToRecent}
                        className="w-full bg-gray-50 dark:bg-gray-600 border dark:border-gray-600 rounded-lg p-4 pr-16 text-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:border-purple-500"
                        placeholder="Enter value"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-300 text-lg font-medium">
                        {fromUnit.symbol}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Swap Button for Mobile */}
                <div className="flex md:hidden justify-center -my-2">
                  <button 
                    onClick={swapUnits}
                    className="p-3 rounded-full bg-purple-500 text-white shadow-lg transform transition-all duration-300 hover:rotate-180"
                  >
                    <RefreshCw className="text-white" size={20} />
                  </button>
                </div>
                
                {/* Swap Button for Desktop */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <button 
                    onClick={swapUnits}
                    className="p-4 rounded-full bg-purple-500 text-white shadow-lg transform transition-all duration-300 hover:rotate-180"
                  >
                    <ArrowRightLeft className="text-white" size={24} />
                  </button>
                </div>
                
                {/* To Unit */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <h3 className="text-lg font-bold">To</h3>
                    <div className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300 text-xs font-bold rounded-md">
                      RESULT
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white dark:bg-gray-700 shadow">
                    <select 
                      value={toUnit.name}
                      onChange={handleToUnitChange}
                      className="w-full bg-gray-50 dark:bg-gray-600 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 border"
                    >
                      {selectedCategory.units.map(unit => (
                        <option key={unit.name} value={unit.name}>
                          {unit.name} ({unit.symbol})
                        </option>
                      ))}
                    </select>
                    
                    <div className="relative">
                      <input
                        type="text"
                        value={formatNumber(toValue)}
                        readOnly
                        className="w-full bg-gray-50 dark:bg-gray-600 border dark:border-gray-600 rounded-lg p-4 pr-16 text-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:border-purple-500"
                        placeholder="Result"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-300 text-lg font-medium">
                        {toUnit.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Conversion Formula Display */}
              <div className="mt-8 p-5 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-700/20 text-center">
                <div className="flex flex-col sm:flex-row items-center justify-center">
                  <div className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 shadow mb-2 sm:mb-0 sm:mr-4">
                    <span className="font-mono">{fromValue ? formatNumber(fromValue) : '0'} {fromUnit.symbol}</span>
                  </div>
                  <span className="mx-2 text-2xl">=</span>
                  <div className="px-4 py-2 rounded-lg bg-purple-500 text-white shadow">
                    <span className="font-mono">{toValue ? formatNumber(toValue) : '0'} {toUnit.symbol}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Recent Conversions Tab */}
        {activeTab === 'saved' && recentConversions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center">
                <Clock size={22} className="mr-2 text-purple-500" />
                Conversion History
              </h2>
              <button
                onClick={() => setRecentConversions([])}
                className="flex items-center px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={16} className="mr-1" /> Clear All
              </button>
            </div>
            
            <div className="space-y-3">
              {recentConversions.map((conversion) => (
                <div 
                  key={conversion.id}
                  onClick={() => recentConversion(conversion)}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-500/20 mr-3">
                      {conversion.categoryIcon}
                    </div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">
                          {conversion.category}
                        </span>
                        <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
                          {getTimeSince(conversion.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap mt-1">
                        <span className="font-medium">{conversion.from}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-medium text-purple-500">{conversion.to}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        recentConversion(conversion);
                      }}
                      className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors duration-200"
                    >
                      <RefreshCw size={16} className="text-purple-500" />
                    </button>
                    <button 
                      onClick={(e) => clearRecentConversion(conversion.id, e)}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors duration-200"
                    >
                      <X size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'saved' && recentConversions.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900/20">
                <History size={48} className="text-purple-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">No conversion history yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your recent conversions will appear here</p>
            <button 
              onClick={() => setActiveTab('converter')}
              className="px-6 py-3 rounded-lg bg-purple-500 text-white font-medium transition-all duration-300 hover:bg-purple-600 shadow-md"
            >
              Start Converting
            </button>
          </div>
        )}
      
        
      </div>
    </div>
  
    
    {/* Custom animations */}
    <style>{`
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out forwards;
      }
    `}</style>
  </div>
);
};

export default UnitConverter;