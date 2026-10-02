/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopBarControls, type TopBarControlsProps } from './TopBarControls';

const props = (
  patch: Partial<TopBarControlsProps> = {},
): TopBarControlsProps => ({
  compact: true,
  name: 'a.pdf',
  onRename: () => {},
  undoLabel: null,
  redoLabel: null,
  onUndo: () => {},
  onRedo: () => {},
  layout: 'focus',
  onToggleFocus: () => {},
  onOpenPages: () => {},
  save: 'saved',
  canToggleSave: false,
  onToggleSave: () => {},
  restricted: false,
  onUnlock: () => {},
  onSearch: () => {},
  onExport: () => {},
  ...patch,
});

describe('TopBarControls More menu', () => {
  it('lists the workspace settings items and runs the chosen one', async () => {
    const onSelect = vi.fn();
    render(
      <TopBarControls
        {...props({
          settingsItems: [
            { id: 'clear', label: 'Clear trusted roots', onSelect },
          ],
        })}
      />,
    );
    const more = screen.getByRole('button', { name: 'More' });
    fireEvent.pointerDown(more, { button: 0, pointerType: 'mouse' });
    fireEvent.click(more);
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Clear trusted roots' }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
