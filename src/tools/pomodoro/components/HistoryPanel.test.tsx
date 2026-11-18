/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  installChartStubs,
  resetChartStubs,
  textsOf,
} from '@/shared/charts/testing';
import { localDate } from '../lib/history';
import { usePomodoroStore } from '../store';
import { HistoryPanel } from './HistoryPanel';

describe('HistoryPanel', () => {
  beforeEach(() => {
    usePomodoroStore.setState({ history: [] });
    installChartStubs();
  });
  afterEach(resetChartStubs);

  it('shows an empty state and no export with no history', () => {
    render(<HistoryPanel />);
    expect(screen.getByText('No sessions yet')).toBeTruthy();
    expect(screen.queryByRole('img', { name: /sessions/i })).toBeNull();
    // Nothing to export: the button is not shown at all.
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
  });

  it('draws the weekly bars and the 12-week heatmap, with data tables', () => {
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
    const week = screen.getByRole('img', {
      name: 'Work sessions, last 7 days',
    });
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    // The bars are labelled by weekday, today last.
    expect(textsOf(week)).toContain(weekday.format(new Date()));
    expect(
      screen.getByRole('img', { name: 'Work sessions, last 12 weeks' }),
    ).toBeTruthy();
    expect(screen.getByText('3 sessions in the last 7 days')).toBeTruthy();

    const [weekTable] = screen.getAllByRole('switch', {
      name: 'Show the data as a table',
    });
    fireEvent.click(weekTable);
    const table = screen.getByRole('table', {
      name: 'Work sessions, last 7 days',
    });
    const rows = within(table).getAllByRole('row');
    // A header row and seven days, today last with its 3 sessions.
    expect(rows).toHaveLength(8);
    expect(rows[7].textContent).toContain('3');

    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    expect((exportButton as HTMLButtonElement).disabled).toBe(false);
  });
});
