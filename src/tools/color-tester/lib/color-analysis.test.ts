import { describe, expect, it } from 'vitest';
import {
  analyzeColor,
  calculateContrastRatio,
  determineColorMood,
  determineColorName,
  generateHarmonyColors,
} from './color-analysis';

describe('calculateContrastRatio', () => {
  it('follows WCAG, rounded to 2 places', () => {
    expect(calculateContrastRatio([255, 255, 255], [0, 0, 0])).toBe(21);
    expect(calculateContrastRatio([0, 0, 0], [255, 255, 255])).toBe(21);
    expect(calculateContrastRatio([0, 0, 0], [0, 0, 0])).toBe(1);
    expect(calculateContrastRatio([70, 130, 180], [255, 255, 255])).toBe(4.11);
  });
});

describe('determineColorName', () => {
  it('names by hue with saturation/lightness modifiers', () => {
    expect(determineColorName(0, 100, 50)).toBe('Vibrant Red');
    expect(determineColorName(350, 50, 50)).toBe('Red');
    expect(determineColorName(210, 30, 20)).toBe('Muted Dark Sky');
    expect(determineColorName(120, 60, 80)).toBe('Light Green');
  });

  it('names a near-grey colour by lightness alone, without a hue', () => {
    expect(determineColorName(0, 5, 95)).toBe('White');
    expect(determineColorName(0, 5, 5)).toBe('Black');
    expect(determineColorName(0, 5, 42.4)).toBe('Gray (42%)');
  });
});

describe('determineColorMood', () => {
  it('describes hue, then saturation and lightness', () => {
    expect(determineColorMood(200, 50, 50)).toBe('Calm and trustworthy');
    expect(determineColorMood(10, 90, 10)).toBe(
      'Energetic and passionate, vibrant and intense, mysterious and powerful',
    );
    expect(determineColorMood(330, 10, 90)).toBe(
      'Dramatic and sophisticated, neutral and subdued, pure and delicate',
    );
  });
});

describe('generateHarmonyColors', () => {
  it('builds the seven harmony colours', () => {
    const h = generateHarmonyColors(0, 100, 50);
    expect(h.complementary).toEqual({
      rgb: 'rgb(0, 255, 255)',
      hex: '#00ffff',
      name: 'Complementary',
    });
    expect(h.triadic1.hex).toBe('#00ff00');
    expect(h.triadic2.hex).toBe('#0000ff');
    expect(h.analogous1.hex).toBe('#ff8000');
    expect(h.analogous2.hex).toBe('#ff0080');
    expect(h.lighter.hex).toBe('#ff6666');
    expect(h.darker.hex).toBe('#990000');
  });
});

describe('analyzeColor', () => {
  it('combines name, mood, harmony and contrast', () => {
    const a = analyzeColor(255, 0, 0);
    expect(a.name).toBe('Vibrant Red');
    expect(a.mood).toBe('Energetic and passionate, vibrant and intense');
    expect(a.harmony.complementary.hex).toBe('#00ffff');
    expect(a.contrast).toEqual({ white: 4, black: 5.25 });
  });
});
