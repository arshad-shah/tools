/** @vitest-environment jsdom */
import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { shellHarness, stubLayoutApis } from '../../test-shell';
import type { ModeContext } from '../types';
import mode from './Mode';
import { openOrganizeDialog, useOrganizeDialog } from './ui-store';

beforeAll(() => registerCoreOperations());
beforeEach(() => {
  stubLayoutApis();
  act(() => openOrganizeDialog(null));
});

describe('Organize dialog store', () => {
  it('closes the open dialog when the mode is left', () => {
    const { result } = renderHook(() => useOrganizeDialog());
    act(() => openOrganizeDialog('labels'));
    expect(result.current).toBe('labels');
    act(() =>
      mode.onLeave!({ tool: { set: () => {} } } as unknown as ModeContext),
    );
    expect(result.current).toBeNull();
  });

  it('closes the open dialog when the document closes', async () => {
    const h = shellHarness();
    const view = render(h.ui);
    await screen.findByRole('toolbar', { name: 'Organize tools' });
    act(() => openOrganizeDialog('size'));
    const { result } = renderHook(() => useOrganizeDialog());
    expect(result.current).toBe('size');
    view.unmount();
    expect(result.current).toBeNull();
  });
});
