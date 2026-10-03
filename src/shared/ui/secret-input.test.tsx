/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SecretInput } from './secret-input';

function Harness() {
  const [value, setValue] = useState('');
  return (
    <>
      <label htmlFor="k">Key</label>
      <SecretInput id="k" value={value} onChange={setValue} label="key" />
    </>
  );
}

describe('SecretInput', () => {
  it('is a masked field that does not autofill, with a reveal toggle', () => {
    render(<Harness />);
    const field = screen.getByLabelText('Key') as HTMLInputElement;
    expect(field.type).toBe('password');
    expect(field.getAttribute('autocomplete')).toBe('off');
    expect(field.getAttribute('spellcheck')).toBe('false');
    fireEvent.change(field, { target: { value: 'hunter-two' } });
    expect(field.value).toBe('hunter-two');

    const reveal = screen.getByRole('button', { name: 'Reveal key' });
    expect(reveal.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(reveal);
    expect(field.type).toBe('text');
    expect(reveal.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(reveal);
    expect(field.type).toBe('password');
  });
});
