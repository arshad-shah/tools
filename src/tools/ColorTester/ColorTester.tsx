import React, { useState, useEffect } from 'react';
import { ColorHarmony, ColorInfo, TabType } from '../../types/ColorTesterTypes';
import { calculateHSL, hexToRgb } from './utils/ColorConverters';
import { calculateContrastRatio, determineColorMood, determineColorName, generateHarmonyColors } from './utils/CalculationUtils';

// Import our components
import ColorDisplay from './components/ColorDisplay';
import ColorValues from './components/ColorValues';
import QuickActions from './components/QuickActions';
import TabNavigation from './components/TabNavigation';
import HarmonyTab from './components/HarmonyTab';
import PsychologyTab from './components/PsychologyTab';
import PreviewTab from './components/PreviewTab';
import AccessibilityTab from './components/AccessibilityTab';
import ColorEditor from './components/ColorEditor';
import AnimationStyles from './components/AnimationStyles';
import ColorPalette from './components/ColorPallete';

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
  
  // Calculate the hex code from RGB values
  const hexCode = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
  
  // Calculate RGB/RGBA string
  const rgbString = alpha < 1 
    ? `rgba(${red}, ${green}, ${blue}, ${alpha})` 
    : `rgb(${red}, ${green}, ${blue})`;
  
  // Calculate text color for contrast
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  const textColor = luminance > 0.5 ? '#1a202c' : '#ffffff';

  // Effects for color analysis and UI state management
  
  // Generate color harmony
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
      // Clear any existing timeout
      if (copiedTimeout) {
        clearTimeout(copiedTimeout);
      }
      
      // Set the copied value and create a new timeout
      setCopiedValue(label);
      const timeout = setTimeout(() => {
        setCopiedValue(null);
      }, 2000);
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
      setTimeout(() => {
        element.classList.remove('pulse-animation');
      }, 500);
    }
  };
  
  // Function to save the current color
  const saveColor = (): void => {
    const colorInfo: ColorInfo = {
      hex: hexCode,
      rgb: rgbString,
      red, 
      green, 
      blue, 
      alpha,
      name: colorNameSuggestion
    };
    setSavedColors([...savedColors, colorInfo]);
    
    // Show quick notification
    const element = document.getElementById('palette-section');
    if (element) {
      element.classList.add('highlight-animation');
      setTimeout(() => {
        element.classList.remove('highlight-animation');
      }, 1000);
    }
  };
  
  // Function to load a saved color
  const loadColor = (colorInfo: ColorInfo): void => {
    setRed(colorInfo.red);
    setGreen(colorInfo.green);
    setBlue(colorInfo.blue);
    setAlpha(colorInfo.alpha || 1);
  };
  
  // Load a suggested harmony color
  const loadHarmonyColor = (rgb: string): void => {
    // Extract RGB values from the rgb string
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

  return (
    <div className="min-h-screen ">
      <AnimationStyles />
      
      <div className="max-w-6xl mx-auto backdrop-blur-sm bg-white/70 rounded-2xl overflow-hidden shadow-xl border border-indigo-100 depth-effect">
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Main color display - Takes up 2 columns */}
            <div className="lg:col-span-2 flex flex-col">
              {/* Color Display */}
              <ColorDisplay 
                hexCode={hexCode}
                rgbString={rgbString}
                textColor={textColor}
                colorNameSuggestion={colorNameSuggestion}
                generateRandomColor={generateRandomColor}
                saveColor={saveColor}
              />
              
              {/* Color Values */}
              <ColorValues 
                hexCode={hexCode}
                rgbString={rgbString}
                copiedValue={copiedValue}
                copyToClipboard={copyToClipboard}
              />
              
              {/* Quick Actions */}
              <QuickActions 
                saveColor={saveColor}
                generateRandomColor={generateRandomColor}
              />
            </div>
            
            {/* Editor Panel - Takes up 3 columns */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <TabNavigation 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
                
                <div className="p-5">
                  {/* Color Harmony */}
                  {activeTab === 'harmony' && colorHarmony && (
                    <HarmonyTab 
                      colorHarmony={colorHarmony}
                      loadHarmonyColor={loadHarmonyColor}
                    />
                  )}
                  
                  {/* Color Psychology */}
                  {activeTab === 'psychology' && (
                    <PsychologyTab 
                      rgbString={rgbString}
                      colorNameSuggestion={colorNameSuggestion}
                      colorMood={colorMood}
                    />
                  )}
                  
                  {/* Text Preview */}
                  {activeTab === 'preview' && (
                    <PreviewTab 
                      rgbString={rgbString}
                      textColor={textColor}
                    />
                  )}
                  
                  {/* Accessibility */}
                  {activeTab === 'accessibility' && (
                    <AccessibilityTab 
                      rgbString={rgbString}
                      contrastRatios={contrastRatios}
                    />
                  )}
                </div>
              </div>
              
              {/* RGB Controls */}
              <ColorEditor 
                red={red}
                green={green}
                blue={blue}
                alpha={alpha}
                hexCode={hexCode}
                setRed={setRed}
                setGreen={setGreen}
                setBlue={setBlue}
                setAlpha={setAlpha}
                handleColorPicker={handleColorPicker}
                showEditorsPanel={showEditorsPanel}
                setShowEditorsPanel={setShowEditorsPanel}
              />
            </div>
          </div>
          
          {/* Saved Colors Palette */}
          <div className="mt-8">
            <ColorPalette
              savedColors={savedColors}
              loadColor={loadColor}
              deleteColor={deleteColor}
              exportPalette={exportPalette}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorTester;