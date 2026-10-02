import { describe, expect, it } from 'vitest';
import {
  HISTORY_CAP,
  pushHistory,
  toPersistedHistory,
  type HistoryItem,
} from './history';
import { emptyRequest } from './model';

const item = (i: number): HistoryItem => ({
  id: `h${i}`,
  at: i,
  mode: 'rest',
  method: 'POST',
  url: `https://x.test/${i}`,
  status: 200,
  durationMs: 5,
  size: 10,
  request: emptyRequest({
    body: { kind: 'raw', text: 'secret body', form: [], contentType: '' },
  }),
});

describe('history', () => {
  it('keeps the newest 50', () => {
    let list: HistoryItem[] = [];
    for (let i = 0; i < 60; i++) list = pushHistory(list, item(i));
    expect(list).toHaveLength(HISTORY_CAP);
    expect(list[0].id).toBe('h59');
    expect(list.at(-1)?.id).toBe('h10');
  });
  it('persists summaries with no body or request', () => {
    const [p] = toPersistedHistory([item(1)]);
    expect(p).not.toHaveProperty('body');
    expect(p).not.toHaveProperty('request');
    expect(JSON.stringify(p)).not.toContain('secret body');
  });
});
