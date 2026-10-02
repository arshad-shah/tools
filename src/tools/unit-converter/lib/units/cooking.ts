import { linear, type Category } from './define';

// Base mL. US customary: cup = 8 US fl oz = 236.5882365 mL, tbsp = 1/2 fl
// oz, tsp = 1/6 fl oz. Metric: cup 250 mL, tbsp 15 mL, tsp 5 mL.
export const cooking: Category = {
  id: 'cooking',
  label: 'Cooking',
  base: 'ml',
  units: [
    linear('ml', 'Millilitres', 'mL', 1),
    linear('l', 'Litres', 'L', 1000),
    linear('cup-us', 'Cups (US)', 'cup', 236.5882365),
    linear('cup-metric', 'Cups (metric)', 'cup (metric)', 250),
    linear('tbsp-us', 'Tablespoons (US)', 'tbsp', 14.78676478125),
    linear('tsp-us', 'Teaspoons (US)', 'tsp', 4.92892159375),
    linear('tbsp-metric', 'Tablespoons (metric)', 'tbsp (metric)', 15),
    linear('tsp-metric', 'Teaspoons (metric)', 'tsp (metric)', 5),
    linear('floz-us', 'Fluid ounces (US)', 'fl oz', 29.5735295625),
  ],
};
