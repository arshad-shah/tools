import { ColorHarmony } from "../../../types/ColorTesterTypes";
import { hslToRgb } from "./ColorConverters";

// Calculate contrast ratio according to WCAG
const calculateContrastRatio = (color1: number[], color2: number[]): number => {
  // Calculate relative luminance
  const getLuminance = (rgb: number[]): number => {
    const [r, g, b] = rgb.map((val) => {
      val /= 255;
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  // Calculate contrast ratio
  const ratio =
    lum1 > lum2 ? (lum1 + 0.05) / (lum2 + 0.05) : (lum2 + 0.05) / (lum1 + 0.05);

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

export { calculateContrastRatio, getAccessibilityLevel, determineColorName, determineColorMood, generateHarmonyColors };