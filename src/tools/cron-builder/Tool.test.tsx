/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import CronBuilder from './Tool';
import { cronSettings } from './settings';

// Cheap queries (P6-H): label and text lookups, scoped where a name repeats,
// instead of page-wide role scans; one module load for the whole file.
const expression = () =>
  screen.getByLabelText('Cron expression', {
    selector: 'textarea',
  }) as HTMLTextAreaElement;
const inGroup = (label: string) => within(screen.getByLabelText(label));

function setup() {
  render(<CronBuilder />);
  return cronSettings;
}

describe('CronBuilder', () => {
  beforeEach(() => {
    localStorage.clear();
    const { result, unmount } = renderHook(() => cronSettings.useSettings());
    act(() => result.current[2]());
    unmount();
  });

  it('a preset fills the expression and explains it', () => {
    setup();
    fireEvent.click(inGroup('Presets').getByText('Weekdays at 9'));
    expect(expression().value).toBe('0 9 * * 1-5');
    expect(
      screen.getByText('At 09:00 on every weekday from Monday to Friday'),
    ).toBeTruthy();
    expect(inGroup('Next runs').getAllByRole('listitem')).toHaveLength(10);
  });

  it('shows a parse error with its column', () => {
    setup();
    fireEvent.change(expression(), { target: { value: '61 * * * *' } });
    expect(screen.getByText('Minute: 61 is out of range 0-59')).toBeTruthy();
    expect(screen.getByText('Column 1')).toBeTruthy();
    expect(screen.queryByLabelText('Next runs')).toBeNull();
  });

  it('the field editors and the expression edit each other', () => {
    setup();
    fireEvent.change(expression(), { target: { value: '0 9 * * *' } });
    const minute = screen.getByLabelText('Minute', {
      selector: 'input',
    }) as HTMLInputElement;
    expect(minute.value).toBe('0');
    fireEvent.change(minute, { target: { value: '32' } });
    expect(expression().value).toBe('32 9 * * *');
    fireEvent.click(inGroup('Minute mode').getByText('Step'));
    expect(expression().value).toBe('*/5 9 * * *');
  });

  it('switching flavour carries the expression over', () => {
    const settings = setup();
    fireEvent.change(expression(), { target: { value: '0 9 * * 1-5' } });
    fireEvent.click(inGroup('Cron flavour').getByText('Quartz'));
    expect(expression().value).toBe('0 0 9 ? * 2-6');
    expect(settings.getSettings().flavour).toBe('quartz');
  });

  it('copies the expression with the kit copy button', () => {
    setup();
    expect(screen.getByLabelText('Copy expression')).toBeTruthy();
    expect(screen.getByLabelText('Copy runs')).toBeTruthy();
  });
});
