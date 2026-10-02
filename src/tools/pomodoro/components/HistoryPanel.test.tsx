/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  installChartStubs,
  resetChartStubs,
} from '@/shared/ui/chart/test-utils';
import { localDate } from '../lib/history';
import { usePomodoroStore } from '../store';
import { HistoryPanel } from './HistoryPanel';

describe('HistoryPanel', () => {
  beforeEach(() => {
    usePomodoroStore.setState({ history: [] });
    installChartStubs();
  });
  afterEach(resetChartStubs);

  it('shows an empty state and a disabled export with no history', () => {
    render(<HistoryPanel />);
    expect(screen.getByRole('heading', { name: 'History' })).toBeTruthy();
    expect(screen.getByText('No sessions yet')).toBeTruthy();
    expect(screen.queryByRole('img', { name: /sessions/i })).toBeNull();
    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    expect((exportButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('draws the weekly bars and the 12-week heatmap', () => {
    usePomodoroStore.setState({
      history: [
        {
          date: localDate(Date.now()),
          workSessions: 3,
          workMinutes: 75,
          breaks: 2,
        },
      ],
    });
    render(<HistoryPanel />);
    expect(
      screen.getByRole('img', { name: 'Work sessions, last 7 days' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Work sessions, last 12 weeks' }),
    ).toBeTruthy();
    expect(screen.getByText('3 sessions in the last 7 days')).toBeTruthy();
    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    expect((exportButton as HTMLButtonElement).disabled).toBe(false);
  });
});
