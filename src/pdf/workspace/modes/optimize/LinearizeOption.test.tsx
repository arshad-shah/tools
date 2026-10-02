/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentApi } from '../types';
import { EXPORT_OPTION_SECTIONS } from '../../export-options';
import { LinearizeOption } from './LinearizeOption';

const options = { filename: 'a.pdf', onlyPages: null, stripMetadata: false };

describe('LinearizeOption', () => {
  it('is an Export dialog section', () => {
    const s = EXPORT_OPTION_SECTIONS.find((x) => x.id === 'linearize');
    expect(s?.Component).toBe(LinearizeOption);
    expect(s?.visible({} as DocumentApi)).toBe(true);
  });

  it('switches "Optimise for fast web view"', () => {
    const set = vi.fn();
    const { rerender } = render(
      <LinearizeOption doc={{} as DocumentApi} options={options} set={set} />,
    );
    const sw = screen.getByRole('switch', {
      name: 'Optimise for fast web view',
    });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(sw);
    expect(set).toHaveBeenCalledWith({ linearize: true });
    rerender(
      <LinearizeOption
        doc={{} as DocumentApi}
        options={{ ...options, linearize: true }}
        set={set}
      />,
    );
    expect(sw.getAttribute('aria-checked')).toBe('true');
  });
});
