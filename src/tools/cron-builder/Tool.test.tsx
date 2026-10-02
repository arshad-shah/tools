/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const expression = () =>
  screen.getByRole('textbox', {
    name: 'Cron expression',
  }) as HTMLTextAreaElement;

async function setup() {
  const { default: CronBuilder } = await import('./Tool');
  const { cronSettings } = await import('./settings');
  render(<CronBuilder />);
  return cronSettings;
}

describe('CronBuilder', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('a preset fills the expression and explains it', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Weekdays at 9' }));
    expect(expression().value).toBe('0 9 * * 1-5');
    expect(
      screen.getByText('At 09:00 on every weekday from Monday to Friday'),
    ).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBe(10);
  });

  it('shows a parse error with its column', async () => {
    await setup();
    fireEvent.change(expression(), { target: { value: '61 * * * *' } });
    expect(screen.getByText('Minute: 61 is out of range 0-59')).toBeTruthy();
    expect(screen.getByText('Column 1')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Next runs' })).toBeNull();
  });

  it('the field editors and the expression edit each other', async () => {
    await setup();
    fireEvent.change(expression(), { target: { value: '0 9 * * *' } });
    const minute = screen.getByRole('textbox', {
      name: 'Minute',
    }) as HTMLInputElement;
    expect(minute.value).toBe('0');
    fireEvent.change(minute, { target: { value: '32' } });
    expect(expression().value).toBe('32 9 * * *');
    const modes = screen.getByRole('radiogroup', { name: 'Minute mode' });
    fireEvent.click(within(modes).getByRole('radio', { name: 'Step' }));
    expect(expression().value).toBe('*/5 9 * * *');
  });

  it('switching flavour carries the expression over', async () => {
    const settings = await setup();
    fireEvent.change(expression(), { target: { value: '0 9 * * 1-5' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Quartz' }));
    expect(expression().value).toBe('0 0 9 ? * 2-6');
    expect(settings.getSettings().flavour).toBe('quartz');
  });
});
