/** @vitest-environment jsdom */
import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chartCanvas,
  installChartStubs,
  resetChartStubs,
  textsOf,
} from '@/shared/charts/testing';
import { ChangeStrip } from './ChangeStrip';

beforeEach(installChartStubs);
afterEach(resetChartStubs);

describe('ChangeStrip', () => {
  it('draws nothing without changes', () => {
    const { container } = render(
      <ChangeStrip anchors={[]} rows={100} onJump={vi.fn()} />,
    );
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('a click on a bar jumps to the first change in its stretch', () => {
    const onJump = vi.fn();
    render(<ChangeStrip anchors={[10, 50, 90]} rows={100} onJump={onJump} />);
    const canvas = chartCanvas('Change positions');
    // The 600 px wide stub box: a click near the right end is past line 50.
    fireEvent.mouseMove(canvas, { clientX: 560, clientY: 30 });
    fireEvent.click(canvas, { clientX: 560, clientY: 30 });
    expect(onJump).toHaveBeenCalledTimes(1);
    expect(onJump).toHaveBeenCalledWith(90);
  });

  it('the arrow keys choose a stretch and Enter jumps to it', () => {
    const onJump = vi.fn();
    render(<ChangeStrip anchors={[10, 50, 90]} rows={100} onJump={onJump} />);
    const canvas = chartCanvas('Change positions');
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(onJump).toHaveBeenCalledWith(10);
  });

  it('labels each bar with its lines', () => {
    render(<ChangeStrip anchors={[3]} rows={4} onJump={vi.fn()} />);
    expect(textsOf(chartCanvas('Change positions'))).toContain('Line 3');
  });
});
