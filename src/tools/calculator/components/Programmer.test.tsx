/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Programmer } from './Programmer';

const Harness = ({ bits = 8, signed = true }) => {
  const [word, setWord] = useState({ wordBits: bits, signed });
  return (
    <Programmer
      wordBits={word.wordBits}
      signed={word.signed}
      onWordChange={(p) => setWord((w) => ({ ...w, ...p }))}
    />
  );
};

const Where = () => {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
};

const renderAt = (bits?: number, signed?: boolean) =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Harness bits={bits} signed={signed} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

describe('Programmer', () => {
  it('reads hex as the raw pattern: FF at 8-bit signed is -1', () => {
    renderAt(8, true);
    fireEvent.change(field('Hexadecimal'), { target: { value: 'FF' } });
    expect(field('Decimal').value).toBe('-1');
    expect(field('Binary').value).toBe('1111 1111');
    expect(field('Octal').value).toBe('377');
  });

  it('wraps a decimal into the word and shows errors inline', () => {
    renderAt(8, false);
    fireEvent.change(field('Decimal'), { target: { value: '300' } });
    expect(field('Hexadecimal').value).toBe('2C');
    fireEvent.change(field('Binary'), { target: { value: '102' } });
    expect(screen.getByRole('alert').textContent).toMatch(/Digit 2/);
  });

  it('evaluates expressions and the operator buttons append to them', () => {
    renderAt(16, true);
    const expr = field('Expression');
    fireEvent.change(expr, { target: { value: '0' } });
    fireEvent.click(screen.getByText('NOT'));
    expect(expr.value).toBe('0~');
    fireEvent.change(expr, { target: { value: '~0' } });
    fireEvent.click(screen.getByText('Evaluate'));
    expect(field('Decimal').value).toBe('-1');
    fireEvent.change(expr, { target: { value: '1 / 0' } });
    fireEvent.keyDown(expr, { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toMatch(/Division by zero/);
  });

  it('toggles bits and re-wraps on a word size change', () => {
    renderAt(8, false);
    fireEvent.click(screen.getByRole('button', { name: /^Bit 7\b/ }));
    expect(field('Decimal').value).toBe('128');
    fireEvent.click(screen.getByText('Signed'));
    expect(field('Decimal').value).toBe('-128');
    fireEvent.click(screen.getByText('16-bit'));
    expect(field('Hexadecimal').value).toBe('FF80');
  });

  it('opens the value in the Number Base Converter', () => {
    renderAt(8, true);
    fireEvent.change(field('Decimal'), { target: { value: '42' } });
    fireEvent.click(screen.getByText('Open in Number Base Converter'));
    expect(screen.getByTestId('where').textContent).toMatch(
      /number.*\?handoff=/,
    );
  });
});
