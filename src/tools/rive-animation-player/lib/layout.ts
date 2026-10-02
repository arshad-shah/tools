import { Alignment, Fit } from '@/shared/ui/adapters/rive-runtime';
import type { AlignFitIndex } from '../types';

export const fitValues: (keyof typeof Fit)[] = [
  'Cover',
  'Contain',
  'Fill',
  'FitWidth',
  'FitHeight',
  'None',
  'ScaleDown',
];

export const alignValues: (keyof typeof Alignment)[] = [
  'TopLeft',
  'TopCenter',
  'TopRight',
  'CenterLeft',
  'Center',
  'CenterRight',
  'BottomLeft',
  'BottomCenter',
  'BottomRight',
];

export const getFitValue = (idx: AlignFitIndex) => Fit[fitValues[idx.fit]];
export const getAlignmentValue = (idx: AlignFitIndex) =>
  Alignment[alignValues[idx.alignment]];

/** Center / Cover, the player's starting layout. */
export const DEFAULT_ALIGN_FIT: AlignFitIndex = {
  alignment: alignValues.indexOf('Center'),
  fit: fitValues.indexOf('Cover'),
};
