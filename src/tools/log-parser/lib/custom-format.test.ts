import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { textHandlers } from '@/shared/workers/handlers';
import { createTextWorker } from '@/shared/workers/text-client';
import { compileCustomFormat, testBudgetMs } from './custom-format';

describe('compileCustomFormat', () => {
  it('maps named groups onto an entry, others become fields', () => {
    const spec = compileCustomFormat({
      name: 'mine',
      pattern: '(?<ts>\\S+) (?<level>\\w+) (?<msg>.*)',
      flags: '',
    });
    expect(spec.id).toBe('custom:mine');
    expect(spec.parse('2024-01-01T00:00:00Z ERROR disk full')).toEqual({
      ts: Date.UTC(2024, 0, 1),
      level: 'error',
      message: 'disk full',
      component: undefined,
      fields: {},
    });
    const withField = compileCustomFormat({
      name: 'f',
      pattern: '(?<user>\\w+): (?<msg>.*)',
      flags: 'g',
    });
    expect(withField.parse('ann: hi')!.fields).toEqual({ user: 'ann' });
    expect(withField.parse('no colon here')).toBeNull();
  });

  it('uses the whole line without a msg group', () => {
    const spec = compileCustomFormat({
      name: 'x',
      pattern: '^(?<level>[A-Z]+)',
      flags: '',
    });
    expect(spec.parse('WARN thing')!.message).toBe('WARN thing');
  });

  it('refuses a pattern without named groups', () => {
    expect(() =>
      compileCustomFormat({ name: 'x', pattern: '(\\S+) (.*)', flags: '' }),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'Add at least a named group msg',
      }),
    );
    expect(() =>
      compileCustomFormat({ name: 'x', pattern: '(', flags: '' }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('budgets 1 s per 1,000 lines', () => {
    expect(testBudgetMs(20)).toBe(1000);
    expect(testBudgetMs(2500)).toBe(3000);
  });
});

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

describe('custom format test run', () => {
  it('surfaces TIMEOUT for a pattern that never finishes', async () => {
    // The P0 harness: an in-process worker whose testFormat hangs, standing
    // in for catastrophic backtracking (which would block this thread).
    const connect = (): RpcEndpoint => {
      const channel = new MessageChannel();
      channels.push(channel);
      exposeRpc(
        {
          ...textHandlers,
          'log.testFormat': () => new Promise<never>(() => {}),
        },
        channel.port2 as unknown as RpcEndpoint,
      );
      channel.port1.start();
      channel.port2.start();
      const port = channel.port1;
      return {
        postMessage: (m, t) => port.postMessage(m, t as never),
        addEventListener: (type, l) =>
          port.addEventListener(type as 'message', l as never),
        removeEventListener: (type, l) =>
          port.removeEventListener(type as 'message', l as never),
        terminate: () => port.close(),
      };
    };
    const w = createTextWorker({ connect, timeoutMs: 50 });
    await expect(
      w.call('log.testFormat', [
        { name: 'bomb', pattern: '(?<msg>(a+)+$)', flags: '' },
        ['a'.repeat(40) + 'b'],
      ]),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
    w.terminate();
  });
});
