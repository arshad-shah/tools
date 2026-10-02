import { describe, expect, it } from 'vitest';
import { parseColor } from '@/shared/lib/colour';
import { qrColours } from './qr-colours';

describe('qrColours', () => {
  it('picks the darkest and lightest colours', () => {
    expect(
      qrColours(['#ff0000', '#102030', '#fafafa', '#3366cc'].map(parseColor)),
    ).toEqual({ fg: '#102030', bg: '#fafafa' });
  });

  it('refuses a low-contrast palette', () => {
    expect(qrColours(['#777777', '#888888'].map(parseColor))).toBeNull();
    expect(qrColours([parseColor('#000000')])).toBeNull();
  });
});
