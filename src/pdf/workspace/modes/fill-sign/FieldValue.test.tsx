/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ViewField } from './fields';
import { FieldValue } from './FieldValue';

const PDF = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 792 };
const field = (over: Partial<ViewField>): ViewField =>
  ({
    key: 'p1/f',
    page: { id: 'p1' },
    pageNumber: 1,
    rect: { x: 100, y: 600, width: 60, height: 60 },
    type: 'multiline',
    label: 'Notes',
    autofill: null,
    status: 'field',
    origin: 'detected',
    value: '',
    filled: true,
    fillOpId: null,
    ...over,
  }) as ViewField;

describe('FieldValue', () => {
  it('draws letter-spaced multiline text on wrapped lines', () => {
    const { container } = render(
      <FieldValue
        field={field({ style: { spacing: 2 } })}
        value="alpha beta gamma"
        transform={PDF}
        quarter={false}
      />,
    );
    const lines = container.querySelectorAll('[aria-hidden="true"]');
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('draws a comb field one character per cell, separators dropped', () => {
    const { container } = render(
      <FieldValue
        field={field({
          type: 'date',
          rect: { x: 100, y: 600, width: 112, height: 15 },
          style: { comb: 8 },
        })}
        value="01/02/2025"
        transform={PDF}
        quarter={false}
      />,
    );
    expect(container.textContent).toBe('01022025');
  });
});
