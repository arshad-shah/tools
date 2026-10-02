/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FontPreview } from './font-preview';

describe('FontPreview', () => {
  it('shows the text in the family, ink, size and slant', () => {
    render(
      <FontPreview
        label="Kristi"
        family="Sign Kristi"
        text="Ada Lovelace"
        slant={12}
        color="#1d4ed8"
        size={32}
      />,
    );
    const img = screen.getByRole('img', { name: 'Kristi' });
    const sample = img.firstElementChild as HTMLElement;
    expect(sample.textContent).toBe('Ada Lovelace');
    expect(sample.style.fontFamily).toContain('Sign Kristi');
    expect(sample.style.color).toBe('rgb(29, 78, 216)');
    expect(sample.style.fontSize).toBe('32px');
    // Positive slant leans right: CSS skewX turns the other way.
    expect(sample.style.transform).toBe('skewX(-12deg)');
  });

  it('shows the placeholder in the ink (it sits on white paper) when there is no text', () => {
    render(
      <FontPreview
        label="Kristi"
        family="Sign Kristi"
        text="  "
        slant={0}
        color="#1d4ed8"
      />,
    );
    const sample = screen.getByRole('img', { name: 'Kristi' })
      .firstElementChild as HTMLElement;
    expect(sample.textContent).toBe('Your name');
    expect(sample.hasAttribute('data-placeholder')).toBe(true);
    expect(sample.style.color).toBe('rgb(29, 78, 216)');
  });

  it('rejects an unvalidated colour or family', () => {
    expect(() =>
      render(
        <FontPreview label="x" family="Sign" text="a" slant={0} color="red" />,
      ),
    ).toThrow(/rrggbb/);
    expect(() =>
      render(
        <FontPreview
          label="x"
          family={'a"; color: red'}
          text="a"
          slant={0}
          color="#111111"
        />,
      ),
    ).toThrow(/family/);
  });
});
