import React, { useState, useEffect } from 'react';
import { ColorHarmony, ColorInfo, TabType } from '../../types/ColorTesterTypes';
import { calculateHSL, hexToRgb } from './utils/ColorConverters';
import { calculateContrastRatio, determineColorMood, determineColorName, generateHarmonyColors } from './utils/CalculationUtils';

// Import enhanced components
import ColorDisplay from './components/ColorDisplay';
import ColorValues from './components/ColorValues';
import TabNavigation from './components/TabNavigation';
import HarmonyTab from './components/HarmonyTab';
import PsychologyTab from './components/PsychologyTab';
import PreviewTab from './components/PreviewTab';
import AccessibilityTab from './components/AccessibilityTab';
import ColorEditor from './components/ColorEditor';
import ColorPalette from './components/ColorPallete';

// Custom styling
const CustomStyles: React.FC = () => (
  <style>{`
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    .pulse-animation {
      animation: pulse 0.5s ease;
    }
    
    @keyframes highlight {
      0% { background-color: rgba(79, 70, 229, 0.1); }
      100% { background-color: transparent; }
    }
    .highlight-animation {
      animation: highlight 1s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
    }
    .float-animation {
      animation: float 3s ease-in-out infinite;
    }
    
    .glass-panel {
      backdrop-filter: blur(12px);
      background: rgba(255, 255, 255, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 
        0 4px 24px rgba(0, 0, 0, 0.08),
        0 1px 2px rgba(0, 0, 0, 0.05);
    }
    
    .depth-shadow {
      box-shadow: 
        0 2px 10px rgba(0, 0, 0, 0.05),
        0 10px 20px rgba(79, 70, 229, 0.1);
    }
    
    .background-pattern {
      background-image: 
        radial-gradient(circle at 80% 20%, rgba(120, 119, 198, 0.3) 0%, transparent 25%),
        radial-gradient(circle at 20% 70%, rgba(255, 120, 180, 0.2) 0%, transparent 30%);
    }
  `}</style>
);

const ColorTester: React.FC = () => {
  // Base color state
  const [red, setRed] = useState<number>(128);
  const [green, setGreen] = useState<number>(128);
  const [blue, setBlue] = useState<number>(128);
  const [alpha, setAlpha] = useState<number>(1);
  
  // UI state
  const [savedColors, setSavedColors] = useState<ColorInfo[]>([
    { red: 255, green: 105, blue: 180, alpha: 1, hex: '#ff69b4', rgb: 'rgb(255, 105, 180)', name: 'Hot Pink' },
    { red: 102, green: 205, blue: 170, alpha: 1, hex: '#66cdaa', rgb: 'rgb(102, 205, 170)', name: 'Medium Aquamarine' },
    { red: 65, green: 105, blue: 225, alpha: 1, hex: '#4169e1', rgb: 'rgb(65, 105, 225)', name: 'Royal Blue' },
    { red: 255, green: 165, blue: 0, alpha: 1, hex: '#ffa500', rgb: 'rgb(255, 165, 0)', name: 'Orange' },
    { red: 75, green: 0, blue: 130, alpha: 1, hex: '#4b0082', rgb: 'rgb(75, 0, 130)', name: 'Indigo' },
    { red: 60, green: 179, blue: 113, alpha: 1, hex: '#3cb371', rgb: 'rgb(60, 179, 113)', name: 'Medium Sea Green' },
  ]);
  
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
  const [colorNameSuggestion, setColorNameSuggestion] = useState<string>('Steel Blue');
  const [colorHarmony, setColorHarmony] = useState<ColorHarmony | null>(null);
  const [colorMood, setColorMood] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('harmony');
  const [contrastRatios, setContrastRatios] = useState<{white: number, black: number}>({ white: 0, black: 0 });
  const [showEditorsPanel, setShowEditorsPanel] = useState<boolean>(true);
  
  // Calculate derived color values
  const hexCode = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
  const rgbString = alpha < 1 ? `rgba(${red}, ${green}, ${blue}, ${alpha})` : `rgb(${red}, ${green}, ${blue})`;
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  const textColor = luminance > 0.5 ? '#1a202c' : '#ffffff';

  // Calculate color harmony
  useEffect(() => {
    const hsl = calculateHSL(red, green, blue);
    setColorHarmony(generateHarmonyColors(hsl.h, hsl.s, hsl.l));
  }, [red, green, blue]);
  
  // Calculate color name and mood
  useEffect(() => {
    const hsl = calculateHSL(red, green, blue);
    setColorNameSuggestion(determineColorName(hsl.h, hsl.s, hsl.l));
    setColorMood(determineColorMood(hsl.h, hsl.s, hsl.l));
  }, [red, green, blue]);
  
  // Calculate contrast ratios for accessibility
  useEffect(() => {
    const whiteRatio = calculateContrastRatio([red, green, blue], [255, 255, 255]);
    const blackRatio = calculateContrastRatio([red, green, blue], [0, 0, 0]);
    setContrastRatios({ white: whiteRatio, black: blackRatio });
  }, [red, green, blue]);

  // Function to copy text to clipboard
  const copyToClipboard = (text: string, label: string): void => {
    navigator.clipboard.writeText(text).then(() => {
      if (copiedTimeout) clearTimeout(copiedTimeout);
      
      setCopiedValue(label);
      const timeout = setTimeout(() => setCopiedValue(null), 2000);
      setCopiedTimeout(timeout);
    });
  };
  
  // Generate random color
  const generateRandomColor = (): void => {
    setRed(Math.floor(Math.random() * 256));
    setGreen(Math.floor(Math.random() * 256));
    setBlue(Math.floor(Math.random() * 256));
    
    // Add animation flair
    const element = document.querySelector('.color-display');
    if (element) {
      element.classList.add('pulse-animation');
      setTimeout(() => element.classList.remove('pulse-animation'), 500);
    }
  };
  
  // Save the current color
  const saveColor = (): void => {
    const colorInfo: ColorInfo = {
      hex: hexCode,
      rgb: rgbString,
      red, green, blue, alpha,
      name: colorNameSuggestion
    };
    setSavedColors([...savedColors, colorInfo]);
    
    // Show quick notification
    const element = document.getElementById('palette-section');
    if (element) {
      element.classList.add('highlight-animation');
      setTimeout(() => element.classList.remove('highlight-animation'), 1000);
    }
  };
  
  // Load a saved color
  const loadColor = (colorInfo: ColorInfo): void => {
    setRed(colorInfo.red);
    setGreen(colorInfo.green);
    setBlue(colorInfo.blue);
    setAlpha(colorInfo.alpha || 1);
  };
  
  // Load a suggested harmony color
  const loadHarmonyColor = (rgb: string): void => {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      setRed(parseInt(match[1]));
      setGreen(parseInt(match[2]));
      setBlue(parseInt(match[3]));
    }
  };
  
  // Handle color picker input
  const handleColorPicker = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const hex = e.target.value;
    const { r, g, b } = hexToRgb(hex);
    setRed(r);
    setGreen(g);
    setBlue(b);
  };
  
  // Delete a saved color
  const deleteColor = (index: number, e: React.MouseEvent): void => {
    e.stopPropagation(); // Prevent triggering the parent button's onClick
    const newColors = [...savedColors];
    newColors.splice(index, 1);
    setSavedColors(newColors);
  };
  
  // Export palette as JSON
  const exportPalette = (): void => {
    const data = JSON.stringify(savedColors, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'color-palette.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    copyToClipboard('Palette successfully exported!', 'export');
  };

  // Common props for ColorEditor component
  const colorEditorProps = {
    red, green, blue, alpha, hexCode,
    setRed, setGreen, setBlue, setAlpha,
    handleColorPicker,
    showEditorsPanel, setShowEditorsPanel
  };

  // Props for active tab content
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'harmony':
        return colorHarmony && <HarmonyTab colorHarmony={colorHarmony} loadHarmonyColor={loadHarmonyColor} />;
      case 'psychology':
        return <PsychologyTab rgbString={rgbString} colorNameSuggestion={colorNameSuggestion} colorMood={colorMood} />;
      case 'preview':
        return <PreviewTab rgbString={rgbString} textColor={textColor} />;
      case 'accessibility':
        return <AccessibilityTab rgbString={rgbString} contrastRatios={contrastRatios} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen background-pattern">
      <CustomStyles />
      
      <div className="max-w-6xl mx-auto">
        <div className="glass-panel rounded-3xl depth-shadow mb-6">
          <div className="p-6">
            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sidebar: Color Display & Basic Controls */}
              <div className="lg:col-span-4">
                <ColorDisplay 
                  hexCode={hexCode}
                  rgbString={rgbString}
                  textColor={textColor}
                  colorNameSuggestion={colorNameSuggestion}
                  generateRandomColor={generateRandomColor}
                  saveColor={saveColor}
                />
                
                <div className="mt-6 space-y-6">
                  <ColorValues 
                    hexCode={hexCode}
                    rgbString={rgbString}
                    copiedValue={copiedValue}
                    copyToClipboard={copyToClipboard}
                  />
                  
                  {/* Mobile-only ColorEditor */}
                  <div className="lg:hidden">
                    <ColorEditor {...colorEditorProps} />
                  </div>
                </div>
              </div>
              
              {/* Main Content */}
              <div className="lg:col-span-8">
                {/* Tab Navigation & Content */}
                <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden mb-6">
                  <TabNavigation 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                  
                  <div className="p-6">
                    {renderActiveTabContent()}
                  </div>
                </div>
                
                {/* Desktop-only ColorEditor */}
                <div className="hidden lg:block">
                  <ColorEditor {...colorEditorProps} />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Saved Colors Palette */}
        <div className="mb-8" id="palette-section">
          <ColorPalette
            savedColors={savedColors}
            loadColor={loadColor}
            deleteColor={deleteColor}
            exportPalette={exportPalette}
          />
        </div>
      
      </div>
    </div>
  );
};

export default ColorTester;