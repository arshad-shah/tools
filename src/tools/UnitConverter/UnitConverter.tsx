import React, { useState, useEffect, ChangeEvent } from 'react';
import { 
  ArrowRightLeft, 
  X, 
  Clock, 
  ChevronDown, 
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
  Battery
} from 'lucide-react';
import { Category, Conversion, Unit } from '../../types/UnitConverterTypes';

const UnitConverter: React.FC = () => {
  // Categories with their units and conversion factors (to base unit)
  const categories: Category[] = [
    {
      name: 'Length',
      icon: <Ruler className="text-blue-500" />,
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
      icon: <Scale className="text-green-500" />,
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
      icon: <Droplet className="text-cyan-500" />,
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
      icon: <Thermometer className="text-red-500" />,
      baseUnit: 'kelvin',
      units: [
        { name: 'Kelvin', symbol: 'K', factor: 1 },
        { name: 'Celsius', symbol: '°C', factor: 1, offset: 273.15 },
        { name: 'Fahrenheit', symbol: '°F', factor: 5/9, offset: 459.67 },
      ]
    },
    {
      name: 'Area',
      icon: <Square className="text-purple-500" />,
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
      icon: <Zap className="text-yellow-500" />,
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
      icon: <Timer className="text-amber-500" />,
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
      icon: <HardDrive className="text-indigo-500" />,
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
      icon: <Gauge className="text-teal-500" />,
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
      icon: <Battery className="text-orange-500" />,
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
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

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

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-gray-900 to-gray-800 text-white transition-all duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Unit Converter
          </h1>
          <p className="text-gray-300 text-lg">Convert between any units with precision</p>
        </div>
        
        {/* Main Tabs */}
        <div className="flex justify-center mb-6">
          <div className="p-1 rounded-lg bg-gray-800 shadow-lg">
            <button
              onClick={() => setActiveTab('converter')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-300 flex items-center ${
                activeTab === 'converter' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg transform scale-105' 
                  : 'bg-transparent hover:bg-gray-700'
              }`}
            >
              <Zap size={18} className="mr-2" />
              Converter
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-300 flex items-center ${
                activeTab === 'saved' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg transform scale-105' 
                  : 'bg-transparent hover:bg-gray-700'
              }`}
            >
              <History size={18} className="mr-2" />
              Recent
              {recentConversions.length > 0 && (
                <span className="ml-2 bg-blue-500 text-xs font-bold px-2 py-1 rounded-full">
                  {recentConversions.length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {activeTab === 'converter' && (
          <>
            {/* Category Selection Dropdown */}
            <div className="mb-8 relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full p-4 bg-gray-800 rounded-xl flex items-center justify-between shadow-lg transition-all duration-300 hover:bg-gray-700 border border-gray-700"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 flex items-center justify-center mr-3">
                    {selectedCategory.icon}
                  </div>
                  <span className="text-xl font-medium">{selectedCategory.name}</span>
                </div>
                <ChevronDown 
                  size={20} 
                  className={`transition-transform duration-300 ${dropdownOpen ? 'transform rotate-180' : ''}`} 
                />
              </button>
              
              {dropdownOpen && (
                <div className="absolute z-10 mt-2 w-full bg-gray-800 rounded-xl shadow-xl border border-gray-700 max-h-64 overflow-y-auto animate-slideDown">
                  {categories.map((category, index) => (
                    <button
                      key={category.name}
                      onClick={() => {
                        setSelectedCategory(category);
                        setDropdownOpen(false);
                      }}
                      className={`w-full p-3 flex items-center hover:bg-gray-700 transition-colors duration-200 ${
                        index !== 0 ? 'border-t border-gray-700' : ''
                      }`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center mr-3">
                        {category.icon}
                      </div>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Conversion Card */}
            <div className="p-6 rounded-xl mb-8 bg-gray-800 shadow-xl relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-xl" 
                   style={{ background: 'linear-gradient(45deg, #4f46e5, #9333ea)', opacity: 0.2 }}></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-xl"
                   style={{ background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', opacity: 0.1 }}></div>
              
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From Unit */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <label className="block text-lg font-medium text-gray-300">From</label>
                    <div className="ml-2 px-2 py-1 bg-blue-600 text-xs font-bold rounded-md animate-pulse">
                      INPUT
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-700 border border-opacity-20 border-gray-500 transition-all duration-300 hover:bg-gray-600">
                    <select 
                      value={fromUnit.name}
                      onChange={handleFromUnitChange}
                      className="w-full bg-gray-700 p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-opacity-50 border-gray-600 border focus:border-blue-500 transition-all duration-300"
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
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-4 pr-16 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        placeholder="Enter value"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 text-xl font-medium">
                        {fromUnit.symbol}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Swap Button */}
                <div className="flex items-center justify-center h-0 md:h-auto">
                  <button 
                    onClick={swapUnits}
                    className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-110 shadow-lg z-10 animate-bounce"
                  >
                    <ArrowRightLeft className="text-white" size={24} />
                  </button>
                </div>
                
                {/* To Unit */}
                <div className="space-y-3 md:col-start-2 md:row-start-1">
                  <div className="flex items-center">
                    <label className="block text-lg font-medium text-gray-300">To</label>
                    <div className="ml-2 px-2 py-1 bg-green-600 text-xs font-bold rounded-md">
                      RESULT
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-700 border border-opacity-20 border-gray-500 transition-all duration-300 hover:shadow-lg">
                    <select 
                      value={toUnit.name}
                      onChange={handleToUnitChange}
                      className="w-full bg-gray-700 p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-opacity-50 border-gray-600 border focus:border-green-500 transition-all duration-300"
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
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-4 pr-16 text-xl focus:outline-none transition-all duration-300"
                        placeholder="Result"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 text-xl font-medium">
                        {toUnit.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Conversion Formula Card */}
              <div className="mt-8 p-5 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-filter backdrop-blur-sm animate-fadeIn">
                <div className="flex items-center justify-center">
                  <div className="px-4 py-2 rounded-lg bg-gray-700 mr-4 shadow-inner">
                    {fromValue ? formatNumber(fromValue) : '0'} {fromUnit.symbol}
                  </div>
                  <span className="mx-2">=</span>
                  <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 shadow-md">
                    {toValue ? formatNumber(toValue) : '0'} {toUnit.symbol}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Recent Conversions Tab */}
        {activeTab === 'saved' && recentConversions.length > 0 && (
          <div className="p-6 rounded-xl bg-gray-800 shadow-xl">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <Clock size={20} className="mr-2" />
              Recent Conversions
            </h3>
            <div className="space-y-3">
              {recentConversions.map((conversion) => (
                <div 
                  key={conversion.id}
                  onClick={() => recentConversion(conversion)}
                  className="p-4 rounded-lg bg-gray-700 hover:bg-gray-600 border border-opacity-10 border-gray-500 flex justify-between items-center cursor-pointer transition-all duration-300 transform hover:scale-102 hover:shadow-lg"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 flex items-center justify-center mr-3 bg-gray-800 rounded-full">
                      {conversion.categoryIcon}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="text-gray-300 text-sm">{conversion.category}</span>
                        <span className="ml-2 text-xs bg-gray-600 px-2 py-1 rounded-full">
                          {getTimeSince(conversion.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span>{conversion.from}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-medium">{conversion.to}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => clearRecentConversion(conversion.id, e)}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'saved' && recentConversions.length === 0 && (
          <div className="p-10 rounded-xl bg-gray-800 text-center shadow-xl">
            <div className="mb-4 flex justify-center">
              <History size={48} className="text-gray-400" />
            </div>
            <p className="text-xl mb-4">No recent conversions yet</p>
            <button 
              onClick={() => setActiveTab('converter')}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 font-medium transition-all duration-300 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105"
            >
              Start Converting
            </button>
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-gray-400 text-sm">
            Precise unit conversions across multiple categories
          </p>
        </div>
      </div>
      
      {/* Custom animations */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default UnitConverter;