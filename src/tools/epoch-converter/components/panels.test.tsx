/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConvertPanel } from './ConvertPanel';
import { MeetingPlanner } from './MeetingPlanner';
import { WorldClock } from './WorldClock';

const writeText = vi.fn(async () => {});
const noop = () => {};

beforeEach(() =>
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } }),
);
afterEach(() => {
  vi.unstubAllGlobals();
  writeText.mockClear();
});

describe('epoch panels', () => {
  it('each conversion copies through the kit copy button', async () => {
    render(
      <ConvertPanel
        text="1700000000000"
        onText={noop}
        readAs="auto"
        onReadAs={noop}
        zone="UTC"
        onZone={noop}
        now={0}
      />,
    );
    fireEvent.click(screen.getByLabelText('Copy ISO 8601 (UTC)'));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('2023-11-14T22:13:20.000Z'),
    );
    expect(await screen.findByLabelText('Copied ISO 8601 (UTC)')).toBeTruthy();
  });

  it('the world clock and the planner show empty states without zones', () => {
    render(
      <>
        <WorldClock instant={0} zones={[]} onZones={noop} />
        <MeetingPlanner zones={[]} workHours={[9, 17]} onWorkHours={noop} />
      </>,
    );
    expect(
      screen.getAllByRole('heading', { name: 'No zones yet' }),
    ).toHaveLength(2);
  });
});
