import { describe, expect, it } from 'vitest';
import {
  addRow,
  draftFromRequest,
  EMPTY_DRAFT,
  removeRow,
  resetDraft,
  updateRow,
  type RequestDraft,
} from './draft';

const populated: RequestDraft = {
  requestType: 'graphql',
  method: 'PUT',
  url: 'old',
  headers: [{ key: 'h', value: '1' }],
  params: [{ key: 'p', value: '1', enabled: false }],
  bodyType: 'json',
  body: '{}',
  graphqlQuery: 'query',
  graphqlVariables: '{"a":1}',
};

describe('request draft', () => {
  it('row helpers are immutable', () => {
    const rows = [{ key: 'a', value: '1' }];
    expect(addRow(rows, { key: '', value: '' })).toHaveLength(2);
    expect(removeRow(rows, 0)).toEqual([]);
    expect(updateRow(rows, 0, 'value', '2')).toEqual([
      { key: 'a', value: '2' },
    ]);
    expect(rows).toEqual([{ key: 'a', value: '1' }]);
  });

  it('updateRow sets a typed boolean field', () => {
    const rows = [{ key: 'a', value: '1', enabled: true }];
    expect(updateRow(rows, 0, 'enabled', false)).toEqual([
      { key: 'a', value: '1', enabled: false },
    ]);
  });

  it('loads a saved request with blank-row fallbacks', () => {
    const d = draftFromRequest({
      id: 'r',
      type: 'request',
      name: 'n',
      method: 'POST',
      url: 'u',
    });
    expect(d).toMatchObject({
      method: 'POST',
      url: 'u',
      requestType: 'rest',
      headers: [{ key: '', value: '' }],
      params: [{ key: '', value: '', enabled: true }],
      bodyType: 'none',
      body: '',
    });
  });

  it('keeps current values for fields the saved request leaves out', () => {
    const d = draftFromRequest(
      {
        id: 'r',
        type: 'request',
        name: 'n',
        method: 'GET',
        url: 'new',
        headers: [],
      },
      populated,
    );
    expect(d).toEqual({
      ...populated,
      method: 'GET',
      url: 'new',
      headers: [{ key: '', value: '' }],
      params: [{ key: '', value: '', enabled: true }],
    });
  });

  it('saved fields override the current draft and rows are copied', () => {
    const headers = [{ key: 'x', value: 'y' }];
    const d = draftFromRequest(
      {
        id: 'r',
        type: 'request',
        name: 'n',
        method: 'POST',
        url: 'u',
        requestType: 'rest',
        headers,
        bodyType: 'x-www-form-urlencoded',
        body: '',
        graphqlQuery: '',
        graphqlVariables: '',
      },
      populated,
    );
    expect(d).toMatchObject({
      requestType: 'rest',
      headers: [{ key: 'x', value: 'y' }],
      bodyType: 'x-www-form-urlencoded',
      body: '',
      graphqlQuery: '',
      graphqlVariables: '',
    });
    expect(d.headers).not.toBe(headers);
  });

  it('reset blanks the draft but keeps the request mode', () => {
    expect(resetDraft(populated)).toEqual({
      ...EMPTY_DRAFT,
      requestType: 'graphql',
    });
  });
});
