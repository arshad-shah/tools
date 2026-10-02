import { describe, expect, it } from 'vitest';
import { explainCron } from './explain';
import { parseCron, type CronFlavour } from './parse';

const explain = (expr: string, flavour: CronFlavour = 'unix') =>
  explainCron(parseCron(expr, flavour));

describe('explainCron', () => {
  const corpus: [string, string, CronFlavour?][] = [
    ['*/5 * * * *', 'Every 5 minutes'],
    ['30 9 * * 1-5', 'At 09:30 on every weekday from Monday to Friday'],
    ['0 0 1 * *', 'At 00:00 on day 1 of every month'],
    [
      '0 0 12 ? * MON#2',
      'At 12:00 on the second Monday of every month',
      'quartz',
    ],
    ['@hourly', 'Every hour'],
    ['@reboot', 'At startup (no scheduled times)'],
    ['* * * * *', 'Every minute'],
    ['0 * * * *', 'Every hour'],
    ['0 */2 * * *', 'Every 2 hours'],
    ['15 * * * *', 'At minute 15 past every hour'],
    ['0 0 * * *', 'At 00:00 every day'],
    ['0 9,17 * * *', 'At 09:00 and 17:00 every day'],
    ['*/15 9-17 * * *', 'Every 15 minutes between 09:00 and 17:59'],
    ['0 9 * * 0', 'At 09:00 on Sunday'],
    ['0 9 * * 1,3,5', 'At 09:00 on Monday, Wednesday and Friday'],
    ['0 0 1 1 *', 'At 00:00 on day 1 of January'],
    ['0 0 1,15 * *', 'At 00:00 on days 1 and 15 of every month'],
    ['0 0 13 * 5', 'At 00:00 on day 13 of every month or on Friday'],
    ['0 0 * 6-8 *', 'At 00:00 every day in June to August'],
    ['0 6 * * 6-7', 'At 06:00 on every day from Saturday to Sunday'],
    ['0 0 0 L * ?', 'At 00:00 on the last day of every month', 'quartz'],
    ['0 0 0 LW * ?', 'At 00:00 on the last weekday of every month', 'quartz'],
    ['0 0 0 ? * 6L', 'At 00:00 on the last Friday of every month', 'quartz'],
    ['*/10 * * * * *', 'Every 10 seconds', 'seconds'],
    ['0 30 8 1 1 ? 2030', 'At 08:30 on day 1 of January in 2030', 'quartz'],
    ['@daily', 'Once a day, at 00:00'],
  ];
  it.each(corpus)('%s', (expr, text, flavour) => {
    expect(explain(expr, flavour)).toBe(text);
  });
});
