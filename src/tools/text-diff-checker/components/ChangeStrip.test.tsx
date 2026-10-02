/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installChartStubs,
  resetChartStubs,
} from '@/shared/ui/chart/test-utils';
import { ChangeStrip } from './ChangeStrip';

beforeEach(installChartStubs);
afterEach(resetChartStubs);

describe('ChangeStrip', () => {
  it('a click on a bar jumps to the first change in its stretch', () => {
    const onJump = vi.fn();
    render(<ChangeStrip anchors={[10, 50, 90]} rows={100} onJump={onJump} />);
    const canvas = screen.getByRole('img', { name: /Change positions/ });
    // The 600 px wide stub box: a click near the right end is past line 50.
    fireEvent.pointerDown(canvas, { clientX: 560, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 560, clientY: 30, pointerId: 1 });
    expect(onJump).toHaveBeenCalledTimes(1);
    expect(onJump).toHaveBeenCalledWith(90);
  });
});
