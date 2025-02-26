
// Define types
interface ColorInfo {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  hex: string;
  rgb: string;
  name?: string;
}

interface HarmonyColor {
  rgb: string;
  name: string;
  hex: string;
}

interface ColorHarmony {
  complementary: HarmonyColor;
  analogous1: HarmonyColor;
  analogous2: HarmonyColor;
  triadic1: HarmonyColor;
  triadic2: HarmonyColor;
  lighter: HarmonyColor;
  darker: HarmonyColor;
}

type TabType = 'harmony' | 'psychology' | 'preview' | 'accessibility';

export type { ColorInfo, HarmonyColor, ColorHarmony, TabType };