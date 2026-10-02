/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FieldBox, type FieldBoxState } from './field-box';
import type { OverlayTransform } from './overlay-layer';

/** PDF page space (y up, 792pt tall) to CSS px at zoom 1. */
const PDF: OverlayTransform = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 792 };
const BOX = { x: 100, y: 700, width: 120, height: 20 };

describe('FieldBox', () => {
  it('renders a button named by its label, sized by the transform', () => {
    const onActivate = vi.fn();
    render(
      <FieldBox
        transform={PDF}
        box={BOX}
        state="field"
        label="Text field: Surname, empty"
        onActivate={onActivate}
        inTabOrder
        data-testid="field-a"
      />,
    );
    const button = screen.getByRole('button', {
      name: 'Text field: Surname, empty',
    });
    const frame = screen.getByTestId('field-a');
    expect(frame.style.left).toBe('100px');
    expect(frame.style.top).toBe('72px');
    expect(frame.style.width).toBe('120px');
    expect(frame.style.height).toBe('20px');
    expect(button.tabIndex).toBe(0);
    fireEvent.click(button);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('keeps suggested fields out of the Tab order', () => {
    render(
      <FieldBox
        transform={PDF}
        box={BOX}
        state="suggested"
        label="Text field: unlabelled, empty"
        onActivate={() => {}}
        inTabOrder={false}
      />,
    );
    expect(screen.getByRole('button').tabIndex).toBe(-1);
  });

  it.each<FieldBoxState>(['field', 'suggested', 'filled', 'focused', 'error'])(
    'marks the %s state',
    (state) => {
      render(
        <FieldBox
          transform={PDF}
          box={BOX}
          state={state}
          label="Field"
          onActivate={() => {}}
          inTabOrder
          data-testid="f"
        />,
      );
      expect(screen.getByTestId('f').dataset.state).toBe(state);
    },
  );

  it('shows an error badge in the error state', () => {
    render(
      <FieldBox
        transform={PDF}
        box={BOX}
        state="error"
        label="Field"
        onActivate={() => {}}
        inTabOrder
        data-testid="f"
      />,
    );
    expect(screen.getByTestId('f').querySelector('svg')).not.toBeNull();
  });

  it('renders the inline editor inside instead of the button', () => {
    render(
      <FieldBox
        transform={PDF}
        box={BOX}
        state="focused"
        label="Text field: Surname, empty"
        onActivate={() => {}}
        inTabOrder
        data-testid="f"
      >
        <input aria-label="Surname" />
      </FieldBox>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(
      screen.getByTestId('f').contains(screen.getByLabelText('Surname')),
    ).toBe(true);
  });

  it('forwards key presses on the button', () => {
    const onKeyDown = vi.fn();
    render(
      <FieldBox
        transform={PDF}
        box={BOX}
        state="field"
        label="Field"
        onActivate={() => {}}
        onKeyDown={onKeyDown}
        inTabOrder
      />,
    );
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Delete' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });
});
