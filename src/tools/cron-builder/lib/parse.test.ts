import { describe, expect, it } from 'vitest';
import { CronError, parseCron, type CronFlavour } from './parse';

const errorOf = (expr: string, flavour: CronFlavour = 'unix'): CronError => {
  try {
    parseCron(expr, flavour);
  } catch (e) {
    return e as CronError;
  }
  throw new Error('expected a throw');
};

describe('parseCron', () => {
  it('reads lists, ranges, steps and names', () => {
    const ast = parseCron('0,30 9-17/2 * JAN-MAR MON-FRI', 'unix');
    expect([...ast.minute.values]).toEqual([0, 30]);
    expect([...ast.hour.values]).toEqual([9, 11, 13, 15, 17]);
    expect([...ast.month.values]).toEqual([1, 2, 3]);
    expect([...ast.dow.values]).toEqual([1, 2, 3, 4, 5]);
    expect([...parseCron('* * * * 5-7', 'unix').dow.values]).toEqual([5, 6, 0]);
    expect([...parseCron('5/20 * * * *', 'unix').minute.values]).toEqual([
      5, 25, 45,
    ]);
  });
  it('numbers Quartz days from Sunday 1', () => {
    expect([...parseCron('0 0 0 ? * 2-6', 'quartz').dow.values]).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });
  it('reads macros in any flavour', () => {
    expect(parseCron('@weekly', 'quartz').macro).toBe('@weekly');
    expect(parseCron('@annually', 'unix').macro).toBe('@yearly');
    expect(parseCron('@reboot', 'unix').reboot).toBe(true);
  });
  it('names the field and column of an error', () => {
    const e = errorOf('0 0 32 * *');
    expect(e).toBeInstanceOf(CronError);
    expect(e.code).toBe('INVALID_INPUT');
    expect(e.message).toBe('Day of month: 32 is out of range 1-31');
    expect(e.field).toBe('dom');
    expect(e.column).toBe(5);
    expect(errorOf('61 * * * *')).toMatchObject({
      message: 'Minute: 61 is out of range 0-59',
      column: 1,
    });
    expect(errorOf('0 0,25 * * *')).toMatchObject({ field: 'hour', column: 5 });
    expect(errorOf('*/0 * * * *').message).toBe(
      'Minute: step 0 must be at least 1',
    );
    expect(errorOf('0 22-2 * * *').message).toBe(
      'Hour: range 22-2 runs backwards',
    );
    expect(errorOf('0 0 * FOO *').message).toBe(
      'Month: "FOO" is not a number or name',
    );
  });
  it('checks the field count and flavour-only syntax', () => {
    expect(errorOf('* * * *').message).toMatch(/^Expected 5 fields/);
    expect(errorOf('* * * * * *').column).toBe(11);
    expect(errorOf('0 0 ? * *').message).toBe(
      'Day of month: ? is only valid in Quartz expressions',
    );
    expect(errorOf('0 0 L * *').message).toBe(
      'Day of month: L is only valid in Quartz expressions',
    );
    expect(errorOf('0 0 0 * * *', 'quartz').message).toBe(
      'Day of week: Quartz needs ? in day of month or day of week',
    );
    expect(errorOf('0 0 0 ? * MON#6', 'quartz').message).toBe(
      'Day of week: #6 is out of range 1-5',
    );
    expect(errorOf('@sometimes').message).toMatch(/Unknown macro/);
    expect(errorOf('').message).toMatch(/^Enter 5 fields/);
  });
});
