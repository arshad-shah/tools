import { linear, type Category } from './define';

// Base degrees: a turn is 360 deg, 2 pi rad and 400 gon.
export const angle: Category = {
  id: 'angle',
  label: 'Angle',
  base: 'deg',
  units: [
    linear('deg', 'Degrees', '°', 1),
    linear('rad', 'Radians', 'rad', 180 / Math.PI),
    linear('mrad', 'Milliradians', 'mrad', 0.18 / Math.PI),
    linear('grad', 'Gradians', 'gon', 0.9),
    linear('arcmin', 'Arcminutes', 'arcmin', 1 / 60),
    linear('arcsec', 'Arcseconds', 'arcsec', 1 / 3600),
    linear('turn', 'Turns', 'turn', 360),
  ],
};
