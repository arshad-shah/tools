/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BytesView } from './bytes-view';
import { asciiCell, formatRow } from './bytes-view-format';

const sample = () => {
  const b = new Uint8Array(20);
  b[0] = 0x00;
  for (let i = 1; i < 16; i++) b[i] = 0x61 + i;
  b[16] = 0x41;
  b[17] = 0x42;
  b[18] = 0x0a;
  b[19] = 0xff;
  return b;
};

describe('BytesView', () => {
  it('row 00000010 shows 41 42 and AB, and byte 0x00 shows as NUL', () => {
    const { container } = render(
      <BytesView bytes={sample()} ariaLabel="File bytes" />,
    );
    const view = screen.getByRole('textbox', { name: 'File bytes' });
    expect(view.getAttribute('aria-readonly')).toBe('true');
    const rows = [...container.querySelectorAll('[data-cs-line]')].map(
      (r) => r.textContent ?? '',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].startsWith('00000000  00 62')).toBe(true);
    expect(rows[0]).toContain('NUL bcdefghijklmnop');
    expect(rows[1].startsWith('00000010  41 42 0A FF')).toBe(true);
    expect(rows[1]).toMatch(/ AB LF \.$/);
  });

  it('formats binary rows and pads a short last row', () => {
    const b = new Uint8Array([0x41, 0x7f]);
    expect(formatRow(b, 0, 'binary', 2).text).toBe(
      '00000000  01000001 01111111  A DEL',
    );
    const short = formatRow(b, 0, 'hex', 4).text;
    expect(short).toBe('00000000  41 7F        A DEL');
  });

  it('names control bytes and keeps printable ASCII', () => {
    expect(asciiCell(0x00).text).toBe('NUL');
    expect(asciiCell(0x1b).text).toBe('ESC');
    expect(asciiCell(0x20).text).toBe(' ');
    expect(asciiCell(0x80).text).toBe('.');
  });

  it('stays virtual for a 16 MB buffer', () => {
    const { container } = render(
      <BytesView bytes={new Uint8Array(16 * 1024 * 1024)} ariaLabel="Big" />,
    );
    expect(container.querySelectorAll('[data-cs-line]').length).toBeLessThan(
      200,
    );
  });
});
