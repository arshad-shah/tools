import React, { useState, useEffect } from 'react';
import { 
  Clipboard, 
  Check, 
  Copy, 
  Eye, 
  Droplet, 
  Save, 
  RefreshCw, 
  Palette, 
  Heart, 
  Sparkles, 
  Search,
  Star, 
  ShieldCheck,
  ChevronDown,
  Info,
  Download,
  Trash2
} from 'lucide-react';
import { ColorHarmony, ColorInfo, TabType } from '../../types/ColorTesterTypes';
import { Input } from '../../components/input';
import { Slider } from '../../components/Slider';

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
    { red: 75, green: 0, blue: 130, alpha: 1, hex: '#4B0082', rgb: 'rgb(75, 0, 130)', name: 'Indigo' },
    { red: 60, green: 179, blue: 113, alpha: 1, hex: '#3CB371', rgb: 'rgb(60, 179, 113)', name: 'Medium Sea Green' },
  ]);
  
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
  const [colorNameSuggestion, setColorNameSuggestion] = useState<string>('Steel Blue');
  const [colorHarmony, setColorHarmony] = useState<ColorHarmony | null>(null);
  const [colorMood, setColorMood] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('harmony');
  const [contrastRatios, setContrastRatios] = useState<{white: number, black: number}>({ white: 0, black: 0 });
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
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

  // Utility color conversion functions
  const calculateHSL = (r: number, g: number, b: number): { h: number, s: number, l: number } => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
    }
    
    return { 
      h: h * 360, 
      s: s * 100, 
      l: l * 100 
    };
  };
  
  // Convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number): { r: number, g: number, b: number } => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r = 0, g = 0, b = 0;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return { 
      r: Math.round(r * 255), 
      g: Math.round(g * 255), 
      b: Math.round(b * 255) 
    };
  };
  
  // Convert hex to RGB
  const hexToRgb = (hex: string): { r: number, g: number, b: number } => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };
  
  // Calculate contrast ratio according to WCAG
  const calculateContrastRatio = (color1: number[], color2: number[]): number => {
    // Calculate relative luminance
    const getLuminance = (rgb: number[]): number => {
      const [r, g, b] = rgb.map(val => {
        val /= 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      return r * 0.2126 + g * 0.7152 + b * 0.0722;
    };
    
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    
    // Calculate contrast ratio
    const ratio = lum1 > lum2 
      ? (lum1 + 0.05) / (lum2 + 0.05)
      : (lum2 + 0.05) / (lum1 + 0.05);
      
    return parseFloat(ratio.toFixed(2));
  };
  
  // Get accessibility level based on contrast ratio
  const getAccessibilityLevel = (ratio: number): { level: string, color: string, passes: boolean } => {
    if (ratio >= 7) {
      return { level: 'AAA', color: 'text-green-600', passes: true };
    } else if (ratio >= 4.5) {
      return { level: 'AA', color: 'text-green-600', passes: true };
    } else if (ratio >= 3) {
      return { level: 'AA Large', color: 'text-yellow-600', passes: true };
    } else {
      return { level: 'Fails', color: 'text-red-600', passes: false };
    }
  };
  
  // Determine a name for the color
  const determineColorName = (h: number, s: number, l: number): string => {
    let name = '';
    let modifier = '';
    
    // Name based on hue
    if (h >= 0 && h < 15) name = 'Red';
    else if (h >= 15 && h < 45) name = 'Orange';
    else if (h >= 45 && h < 75) name = 'Yellow';
    else if (h >= 75 && h < 105) name = 'Lime';
    else if (h >= 105 && h < 135) name = 'Green';
    else if (h >= 135 && h < 165) name = 'Teal';
    else if (h >= 165 && h < 195) name = 'Cyan';
    else if (h >= 195 && h < 225) name = 'Sky';
    else if (h >= 225 && h < 255) name = 'Blue';
    else if (h >= 255 && h < 285) name = 'Indigo';
    else if (h >= 285 && h < 315) name = 'Purple';
    else if (h >= 315 && h < 345) name = 'Magenta';
    else name = 'Red';
    
    // Add modifiers based on saturation and lightness
    if (s < 10) {
      if (l > 90) modifier = 'White';
      else if (l < 10) modifier = 'Black';
      else modifier = `Gray (${Math.round(l)}%)`;
    } else {
      if (s < 40) modifier = 'Muted ';
      else if (s > 80) modifier = 'Vibrant ';
      
      if (l < 30) modifier += 'Dark ';
      else if (l > 70) modifier += 'Light ';
    }
    
    return modifier + name;
  };
  
  // Determine mood/psychology of color
  const determineColorMood = (h: number, s: number, l: number): string => {
    let mood = '';
    
    // Analyze hue
    if (h >= 0 && h < 30) {
      mood = 'Energetic and passionate';
    } else if (h >= 30 && h < 60) {
      mood = 'Warm and cheerful';
    } else if (h >= 60 && h < 120) {
      mood = 'Natural and fresh';
    } else if (h >= 120 && h < 180) {
      mood = 'Peaceful and balanced';
    } else if (h >= 180 && h < 240) {
      mood = 'Calm and trustworthy';
    } else if (h >= 240 && h < 300) {
      mood = 'Creative and luxurious';
    } else {
      mood = 'Dramatic and sophisticated';
    }
    
    // Adjust based on saturation and lightness
    if (s < 20) {
      mood += ', neutral and subdued';
    } else if (s > 80) {
      mood += ', vibrant and intense';
    }
    
    if (l < 20) {
      mood += ', mysterious and powerful';
    } else if (l > 80) {
      mood += ', pure and delicate';
    }
    
    return mood;
  };
  
  // Generate color harmony palette
  const generateHarmonyColors = (h: number, s: number, l: number): ColorHarmony => {
    // Complementary (opposite on the color wheel)
    const complementaryH = (h + 180) % 360;
    const complementary = hslToRgb(complementaryH, s, l);
    
    // Analogous (adjacent on the color wheel)
    const analogous1H = (h + 30) % 360;
    const analogous2H = (h - 30 + 360) % 360;
    const analogous1 = hslToRgb(analogous1H, s, l);
    const analogous2 = hslToRgb(analogous2H, s, l);
    
    // Triadic (three colors evenly spaced)
    const triadic1H = (h + 120) % 360;
    const triadic2H = (h + 240) % 360;
    const triadic1 = hslToRgb(triadic1H, s, l);
    const triadic2 = hslToRgb(triadic2H, s, l);
    
    // Calculate monochromatic shades
    const lighter = hslToRgb(h, s, Math.min(l + 20, 95));
    const darker = hslToRgb(h, s, Math.max(l - 20, 5));
    
    // Helper to create hex from rgb
    const rgbToHex = (r: number, g: number, b: number): string => {
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };
    
    return {
      complementary: {
        rgb: `rgb(${complementary.r}, ${complementary.g}, ${complementary.b})`,
        hex: rgbToHex(complementary.r, complementary.g, complementary.b),
        name: 'Complementary'
      },
      analogous1: {
        rgb: `rgb(${analogous1.r}, ${analogous1.g}, ${analogous1.b})`,
        hex: rgbToHex(analogous1.r, analogous1.g, analogous1.b),
        name: 'Analogous 1'
      },
      analogous2: {
        rgb: `rgb(${analogous2.r}, ${analogous2.g}, ${analogous2.b})`,
        hex: rgbToHex(analogous2.r, analogous2.g, analogous2.b),
        name: 'Analogous 2'
      },
      triadic1: {
        rgb: `rgb(${triadic1.r}, ${triadic1.g}, ${triadic1.b})`,
        hex: rgbToHex(triadic1.r, triadic1.g, triadic1.b),
        name: 'Triadic 1'
      },
      triadic2: {
        rgb: `rgb(${triadic2.r}, ${triadic2.g}, ${triadic2.b})`,
        hex: rgbToHex(triadic2.r, triadic2.g, triadic2.b),
        name: 'Triadic 2'
      },
      lighter: {
        rgb: `rgb(${lighter.r}, ${lighter.g}, ${lighter.b})`,
        hex: rgbToHex(lighter.r, lighter.g, lighter.b),
        name: 'Lighter'
      },
      darker: {
        rgb: `rgb(${darker.r}, ${darker.g}, ${darker.b})`,
        hex: rgbToHex(darker.r, darker.g, darker.b),
        name: 'Darker'
      }
    };
  };

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

  
  // Event handlers
  
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
  
  // Handle color slider mouse events for hover effects
  const handleSliderMouseEnter = (colorName: string): void => {
    setHoveredColor(colorName);
  };
  
  const handleSliderMouseLeave = (): void => {
    setHoveredColor(null);
  };
  
  // Custom slider styles based on RGB values
  const getSliderStyle = (color: string): React.CSSProperties => {
    let gradient;
    
    switch(color) {
      case 'red':
        gradient = `linear-gradient(to right, rgb(0, ${green}, ${blue}), rgb(255, ${green}, ${blue}))`;
        break;
      case 'green':
        gradient = `linear-gradient(to right, rgb(${red}, 0, ${blue}), rgb(${red}, 255, ${blue}))`;
        break;
      case 'blue':
        gradient = `linear-gradient(to right, rgb(${red}, ${green}, 0), rgb(${red}, ${green}, 255))`;
        break;
      default:
        gradient = 'linear-gradient(to right, transparent, black)';
    }
    
    const isHovered = hoveredColor === color;
    
    return {
      background: gradient,
      height: '10px',
      borderRadius: '5px',
      outline: 'none',
      WebkitAppearance: 'none',
      appearance: 'none',
      boxShadow: isHovered ? '0 0 0 2px rgba(79, 70, 229, 0.3)' : 'none',
      transition: 'all 0.2s ease'
    };
  };

  // CSS Animation classes
  const pulseAnimation = `
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
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
    }
    .float-animation {
      animation: float 3s ease-in-out infinite;
    }
    
    .slider-thumb::before {
      content: '';
      width: 16px;
      height: 16px;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      cursor: pointer;
      margin-top: -6px;
      border: 2px solid rgba(79, 70, 229, 0.8);
      transition: all 0.2s ease;
    }
    
    input[type=range]::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }
    
    .glass-effect {
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .depth-effect {
      box-shadow: 
        0 2px 10px rgba(0, 0, 0, 0.05),
        0 10px 20px rgba(79, 70, 229, 0.1);
    }
    
    .ripple-bg {
      background-image: radial-gradient(
        circle at center,
        rgba(79, 70, 229, 0.1) 0%, 
        rgba(79, 70, 229, 0.05) 25%, 
        rgba(79, 70, 229, 0.01) 70%, 
        transparent 100%
      );
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900/5 via-slate-50 to-purple-900/5 p-6">
      <style>{pulseAnimation}</style>
      
      <div className="max-w-6xl mx-auto backdrop-blur-sm bg-white/70 rounded-2xl overflow-hidden shadow-xl border border-indigo-100 depth-effect">
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Main color display - Takes up 2 columns */}
            <div className="lg:col-span-2 flex flex-col">
              {/* Color Display */}
              <div 
                className="w-full h-64 rounded-2xl shadow-lg mb-4 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden color-display group"
                style={{ backgroundColor: rgbString }}
              >
                <div className="backdrop-blur-sm bg-black/10 px-5 py-3 rounded-xl shadow-sm border border-white/20">
                  <span style={{ color: textColor }} className="font-mono text-xl font-bold tracking-wide">
                    {hexCode}
                  </span>
                </div>
                
                <div 
                  className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm shadow-sm border border-white/20"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: textColor }}
                >
                  <div className="flex items-center">
                    <Search size={14} className="mr-1.5" />
                    {colorNameSuggestion}
                  </div>
                </div>
                
                <div className="absolute top-0 right-0 p-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-sm border border-white/30 text-white"
                    onClick={generateRandomColor}
                    title="Generate random color"
                  >
                    <RefreshCw size={18} />
                  </button>
                  
                  <button 
                    className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-sm border border-white/30 text-white"
                    onClick={saveColor}
                    title="Save to palette"
                  >
                    <Save size={18} />
                  </button>
                </div>
                
                <div className="absolute top-4 left-4 pointer-events-none">
                  <div className="flex space-x-1.5">
                    <div className="w-3 h-3 bg-red-500 rounded-full opacity-80"></div>
                    <div className="w-3 h-3 bg-amber-500 rounded-full opacity-80"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full opacity-80"></div>
                  </div>
                </div>
              </div>
              
              {/* Color Values */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-gray-700 flex items-center">
                    <Clipboard size={15} className="mr-1.5 text-indigo-500" />
                    Color Values
                  </h2>
                  
                  {copiedValue && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse shadow-sm">
                      <Check size={12} className="mr-1" />
                      Copied!
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-indigo-100 hover:border-indigo-200 transition-all duration-200 relative group flex items-center">
                    <div className="w-1.5 h-full absolute left-0 top-0 bg-indigo-400 rounded-l-lg opacity-70"></div>
                    <div className="pl-2 flex-1">
                      <span className="text-xs font-medium text-indigo-500 block uppercase tracking-wide">HEX</span>
                      <span className="font-mono text-gray-800 text-sm select-all">{hexCode}</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(hexCode, 'hex')}
                      className="text-gray-400 hover:text-indigo-500 transition-colors p-1.5 rounded-full hover:bg-indigo-50"
                      title="Copy HEX code"
                    >
                      {copiedValue === 'hex' ? 
                        <Check size={18} className="text-green-500" /> : 
                        <Copy size={18} className="opacity-80 group-hover:opacity-100" />}
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-green-100 hover:border-green-200 transition-all duration-200 relative group flex items-center">
                    <div className="w-1.5 h-full absolute left-0 top-0 bg-green-400 rounded-l-lg opacity-70"></div>
                    <div className="pl-2 flex-1">
                      <span className="text-xs font-medium text-green-500 block uppercase tracking-wide">RGB</span>
                      <span className="font-mono text-gray-800 text-sm select-all">{rgbString}</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(rgbString, 'rgb')}
                      className="text-gray-400 hover:text-green-500 transition-colors p-1.5 rounded-full hover:bg-green-50"
                      title="Copy RGB value"
                    >
                      {copiedValue === 'rgb' ? 
                        <Check size={18} className="text-green-500" /> : 
                        <Copy size={18} className="opacity-80 group-hover:opacity-100" />}
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-amber-100 hover:border-amber-200 transition-all duration-200 relative group flex items-center">
                    <div className="w-1.5 h-full absolute left-0 top-0 bg-amber-400 rounded-l-lg opacity-70"></div>
                    <div className="pl-2 flex-1">
                      <span className="text-xs font-medium text-amber-500 block uppercase tracking-wide">CSS</span>
                      <span className="font-mono text-gray-800 text-sm select-all">color: {rgbString};</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(`color: ${rgbString};`, 'css')}
                      className="text-gray-400 hover:text-amber-500 transition-colors p-1.5 rounded-full hover:bg-amber-50"
                      title="Copy CSS declaration"
                    >
                      {copiedValue === 'css' ? 
                        <Check size={18} className="text-green-500" /> : 
                        <Copy size={18} className="opacity-80 group-hover:opacity-100" />}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Color Controls */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-gray-700 flex items-center">
                    <Droplet size={15} className="mr-1.5 text-indigo-500" />
                    Quick Actions
                  </h2>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    className="flex-1 py-2.5 px-4 rounded-lg font-medium text-white transition-all bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg flex items-center justify-center"
                    onClick={saveColor}
                  >
                    <Save size={16} className="mr-2" />
                    Save Color
                  </button>
                  <button
                    className="flex-1 py-2.5 px-4 rounded-lg font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow transition-all flex items-center justify-center"
                    onClick={generateRandomColor}
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Random
                  </button>
                </div>
              </div>
            </div>
            
            {/* Editor Panel - Takes up 3 columns */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="flex items-center border-b border-gray-100">
                  <button
                    className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'harmony' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('harmony')}
                  >
                    <div className="flex items-center justify-center">
                      <Sparkles size={15} className="mr-1.5" />
                      Harmony
                    </div>
                    {activeTab === 'harmony' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
                    )}
                  </button>
                  
                  <button
                    className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'psychology' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('psychology')}
                  >
                    <div className="flex items-center justify-center">
                      <Heart size={15} className="mr-1.5" />
                      Psychology
                    </div>
                    {activeTab === 'psychology' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
                    )}
                  </button>
                  
                  <button
                    className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'preview' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('preview')}
                  >
                    <div className="flex items-center justify-center">
                      <Eye size={15} className="mr-1.5" />
                      Preview
                    </div>
                    {activeTab === 'preview' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
                    )}
                  </button>
                  
                  <button
                    className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'accessibility' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('accessibility')}
                  >
                    <div className="flex items-center justify-center">
                      <ShieldCheck size={15} className="mr-1.5" />
                      Accessibility
                    </div>
                    {activeTab === 'accessibility' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
                    )}
                  </button>
                </div>
                
                <div className="p-5">
                  {/* Color Harmony */}
                  {activeTab === 'harmony' && colorHarmony && (
                    <div className="fade-in">
                      <div className="flex items-center mb-4">
                        <Sparkles size={16} className="mr-1.5 text-indigo-500" />
                        <h2 className="text-sm font-medium text-gray-700">Harmonious Colors</h2>
                        <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full">
                          Color Theory
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(colorHarmony).map(([key, color]) => (
                          <button
                            key={key}
                            className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm flex items-center space-x-3 hover:border-indigo-200 hover:shadow transition-all duration-200 group"
                            onClick={() => loadHarmonyColor(color.rgb)}
                          >
                            <div 
                              className="w-10 h-10 rounded-lg shadow-inner group-hover:scale-110 transition-transform duration-200"
                              style={{ backgroundColor: color.rgb }}
                            ></div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium">{color.name}</div>
                              <div className="text-xs font-mono text-gray-500">{color.hex}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Color Psychology */}
                  {activeTab === 'psychology' && (
                    <div className="fade-in">
                      <div className="flex items-center mb-4">
                        <Heart size={16} className="mr-1.5 text-indigo-500" />
                        <h2 className="text-sm font-medium text-gray-700">Color Psychology</h2>
                        <span className="ml-2 bg-pink-100 text-pink-800 text-xs px-2 py-0.5 rounded-full">
                          Emotional Impact
                        </span>
                      </div>
                      
                      <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 shadow-sm border border-gray-100">
                        <div className="flex items-start space-x-4">
                          <div 
                            className="w-16 h-16 rounded-lg shadow-inner flex-shrink-0"
                            style={{ backgroundColor: rgbString }}
                          ></div>
                          <div className="flex-1">
                            <h3 className="font-medium text-base flex items-center">
                              {colorNameSuggestion}
                              <Star size={14} className="ml-1.5 text-amber-400" />
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 mb-3">{colorMood}</p>
                            
                            <div className="flex flex-wrap gap-1.5">
                              {colorMood.split(',').map((trait, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700"
                                >
                                  {trait.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Text Preview */}
                  {activeTab === 'preview' && (
                    <div className="fade-in">
                      <div className="flex items-center mb-4">
                        <Eye size={16} className="mr-1.5 text-indigo-500" />
                        <h2 className="text-sm font-medium text-gray-700">Text Preview</h2>
                        <span className="ml-2 bg-cyan-100 text-cyan-800 text-xs px-2 py-0.5 rounded-full">
                          Visual Test
                        </span>
                      </div>
                      
                      <div className="rounded-lg p-6 shadow-sm flex flex-col items-center justify-center space-y-4"
                        style={{ backgroundColor: rgbString }}>
                        <div>
                          <h3 style={{ color: textColor }} className="font-bold text-2xl mb-1 text-center">Heading Text</h3>
                          <p style={{ color: textColor }} className="text-base mb-2 text-center">
                            This is a subheading that explains the main content
                          </p>
                          <p style={{ color: textColor }} className="text-sm mb-4 text-center max-w-lg">
                            This is how your text will appear on this background color. Good contrast ensures proper readability for your users. This paragraph demonstrates typical body text.
                          </p>
                          
                          <div className="flex justify-center space-x-3">
                            <button 
                              className="px-4 py-1.5 rounded-lg text-sm font-medium"
                              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: textColor, border: `1px solid rgba(${textColor === '#ffffff' ? '255, 255, 255' : '0, 0, 0'}, 0.1)` }}
                            >
                              Primary Button
                            </button>
                            <button 
                              className="px-4 py-1.5 rounded-lg text-sm font-medium border"
                              style={{ color: textColor, borderColor: `rgba(${textColor === '#ffffff' ? '255, 255, 255' : '0, 0, 0'}, 0.2)` }}
                            >
                              Secondary Button
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Accessibility */}
                  {activeTab === 'accessibility' && (
                    <div className="fade-in">
                      <div className="flex items-center mb-4">
                        <ShieldCheck size={16} className="mr-1.5 text-indigo-500" />
                        <h2 className="text-sm font-medium text-gray-700">Accessibility</h2>
                        <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
                          WCAG Standards
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                          <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                            <span className="w-3 h-3 bg-white border border-gray-300 rounded-full mr-2"></span>
                            White Text
                          </h3>
                          <div className="rounded-lg overflow-hidden mb-3 shadow-sm">
                            <div style={{ backgroundColor: rgbString }} className="p-4 flex flex-col items-center justify-center">
                              <span className="text-white text-lg font-semibold mb-1">Heading</span>
                              <span className="text-white text-sm">Normal text</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Contrast: {contrastRatios.white}:1</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full ${getAccessibilityLevel(contrastRatios.white).color} bg-opacity-20 font-medium`}>
                              {getAccessibilityLevel(contrastRatios.white).level}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            {getAccessibilityLevel(contrastRatios.white).passes ? 
                              "Passes accessibility requirements" : 
                              "Does not meet accessibility standards"}
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                          <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                            <span className="w-3 h-3 bg-black rounded-full mr-2"></span>
                            Black Text
                          </h3>
                          <div className="rounded-lg overflow-hidden mb-3 shadow-sm">
                            <div style={{ backgroundColor: rgbString }} className="p-4 flex flex-col items-center justify-center">
                              <span className="text-black text-lg font-semibold mb-1">Heading</span>
                              <span className="text-black text-sm">Normal text</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Contrast: {contrastRatios.black}:1</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full ${getAccessibilityLevel(contrastRatios.black).color} bg-opacity-20 font-medium`}>
                              {getAccessibilityLevel(contrastRatios.black).level}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            {getAccessibilityLevel(contrastRatios.black).passes ? 
                              "Passes accessibility requirements" : 
                              "Does not meet accessibility standards"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="flex items-start">
                          <Info size={16} className="text-indigo-500 mt-0.5 mr-2 flex-shrink-0" />
                          <div className="text-xs text-indigo-700">
                            <p className="font-medium mb-1">WCAG Compliance Guidelines:</p>
                            <ul className="list-disc pl-4 space-y-1">
                              <li>AA standard requires at least 4.5:1 for normal text</li>
                              <li>AAA standard requires at least 7:1 for normal text</li>
                              <li>Large text (18pt+) only needs 3:1 for AA standard</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* RGB Controls */}
              <div className="mt-4 bg-white p-5 rounded-xl shadow-md border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-gray-700 flex items-center">
                    <Droplet size={15} className="mr-1.5 text-indigo-500" />
                    Color Editor
                  </h2>
                  
                  <button
                    onClick={() => setShowEditorsPanel(!showEditorsPanel)}
                    className="text-xs flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    <ChevronDown size={14} className={`mr-1 transform ${showEditorsPanel ? '' : 'rotate-180'}`} />
                    {showEditorsPanel ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {showEditorsPanel && (
                  <div className="space-y-4 fade-in">
                    <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                      <Input
                        type="color"
                        value={hexCode}
                        onChange={handleColorPicker}
                        className="w-full h-12 cursor-pointer border-0 rounded-lg p-1"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center">
                          <div className="w-3 h-3 rounded-full bg-red-500 mr-1.5"></div>
                          Red
                        </label>
                        <span className="text-sm font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          {red}
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={255}
                        value={[red]}
                        onValueChange={(value) => setRed(value[0])}
                        className="w-full"
                        variant='red'
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></div>
                          Green
                        </label>
                        <span className="text-sm font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          {green}
                        </span>
                      </div>

                      <Slider
                        min={0}
                        max={255}
                        value={[green]}
                        onValueChange={(value) => setGreen(value[0])}
                        className="w-full"
                        variant='green'
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>
                          Blue
                        </label>
                        <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {blue}
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={255}
                        value={[blue]}
                        onValueChange={(value) => setBlue(value[0])}
                        className="w-full"
                        variant='blue'
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center">
                          <Eye size={14} className="mr-1.5 text-gray-500" />
                          Opacity
                        </label>
                        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {(alpha * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={[alpha]}
                        onValueChange={(value) => setAlpha(parseFloat(value[0].toFixed(2)))}
                        className="w-full"
                        variant='alpha'
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Saved Colors Palette */}
          <div id="palette-section" className="mt-8 p-5 bg-white rounded-xl shadow-md border border-gray-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Palette size={16} className="mr-1.5 text-indigo-500" />
                <h2 className="text-sm font-medium text-gray-700">Color Palette</h2>
                <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {savedColors.length} colors
                </span>
              </div>
              
              <button 
                onClick={exportPalette}
                className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                title="Export palette"
              >
                <Download size={14} className="mr-1.5" />
                Export Palette
              </button>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
              {savedColors.map((color, index) => (
                <div key={index} className="relative group">
                  <button
                    className="w-full aspect-square rounded-lg shadow-sm hover:shadow transition-shadow border border-gray-200 group-hover:scale-105 duration-200"
                    style={{ backgroundColor: color.rgb }}
                    onClick={() => loadColor(color)}
                    title={color.hex}
                  >
                    <span className="sr-only">Load color {color.hex}</span>
                  </button>
                  
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 bg-white px-2 py-1 rounded shadow-md text-center z-10 whitespace-nowrap text-xs">
                    {color.hex}
                  </div>
                  
                  <button 
                    className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    onClick={(e) => deleteColor(index, e)}
                    title="Remove color"
                  >
                    <Trash2 size={12} className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorTester;