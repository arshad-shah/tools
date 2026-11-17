import { MessageChannel } from 'node:worker_threads';
import initSqlJs from 'sql.js';
import { afterEach, describe, expect, it } from 'vitest';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { createSqlHandlers } from '../worker/handlers';
import { createSqlClient } from './client';

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

/** Each connect is a fresh "worker" (a new, empty database). */
function setup() {
  let workers = 0;
  const client = createSqlClient(() => {
    workers++;
    const channel = new MessageChannel();
    channels.push(channel);
    const handlers = createSqlHandlers(() => initSqlJs());
    exposeRpc(
      {
        ...handlers,
        // A query that never returns, as a runaway one in wasm would.
        exec: (ctx, sql: string, max: number) =>
          sql === 'HANG' ? new Promise(() => {}) : handlers.exec(ctx, sql, max),
      } as typeof handlers,
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
    } satisfies RpcEndpoint;
  });
  return { client, workers: () => workers };
}

describe('sql client', () => {
  it('loads text as a table and queries it', async () => {
    const { client } = setup();
    const summary = await client.importText({
      name: 'My Data.csv',
      text: 'a,b\n1,x\n2,y\n',
    });
    expect(summary).toEqual({
      table: 'my_data',
      rows: 2,
      columns: 2,
      warnings: [],
    });
    const out = await client.exec('SELECT sum(a) FROM my_data');
    expect(out.results[0].rows).toEqual([[3]]);
  });

  it('rebuilds the database after a cancelled query stops the worker', async () => {
    const { client, workers } = setup();
    await client.importText({ name: 't.csv', text: 'n\n1\n2\n' });
    await client.exec(
      'INSERT INTO t VALUES (3); CREATE TABLE extra (x) -- note',
    );
    await client.exec('SELECT * FROM t');
    expect(client.journalLength).toBe(2);
    const rebuilt = new Promise((r) => client.onRebuilt(r));
    const ctrl = new AbortController();
    const hang = client.exec('HANG', { signal: ctrl.signal });
    ctrl.abort();
    await expect(hang).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(await rebuilt).toBeNull();
    expect(workers()).toBe(2);
    const out = await client.exec('SELECT count(*) FROM t');
    expect(out.results[0].rows).toEqual([[3]]);
    expect((await client.schema()).map((t) => t.name)).toEqual(['extra', 't']);
  });

  it('opening a database starts a new history; reset empties it', async () => {
    const { client } = setup();
    await client.exec('CREATE TABLE a (x); INSERT INTO a VALUES (1)');
    const bytes = await client.exportDb();
    await client.reset();
    expect(await client.schema()).toEqual([]);
    expect(client.journalLength).toBe(0);
    await client.open(bytes);
    expect(client.journalLength).toBe(1);
    expect((await client.exec('SELECT x FROM a')).results[0].rows).toEqual([
      [1],
    ]);
  });

  it('reports what was wrong with a file', async () => {
    const { client } = setup();
    await expect(client.open(new Uint8Array(10))).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
    await expect(
      client.importText({ name: 'x.json', text: '{bad' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(client.journalLength).toBe(0);
  });
});
