import { describe, expect, it } from 'vitest';
import type { HttpResponse } from './http';
import {
  bodyView,
  findTokens,
  reasonPhrase,
  statusTone,
} from './response-view';

const res = (over: Partial<HttpResponse>): HttpResponse => ({
  status: 200,
  statusText: '',
  headers: [],
  bytes: new Uint8Array(1),
  size: 1,
  contentType: 'text/plain',
  text: 'x',
  ...over,
});

describe('response view helpers', () => {
  it('fills a missing reason phrase', () => {
    expect(reasonPhrase(204)).toBe('No Content');
    expect(reasonPhrase(200, 'Fine')).toBe('Fine');
    expect(statusTone(404)).toBe('warning');
  });
  it('picks the body view', () => {
    expect(bodyView(res({ size: 0 }))).toBe('empty');
    expect(
      bodyView(res({ json: { a: 1 }, contentType: 'application/json' })),
    ).toBe('json');
    expect(bodyView(res({ contentType: 'application/json' }))).toBe('text');
    expect(bodyView(res({ contentType: 'text/html' }))).toBe('html');
    expect(bodyView(res({ contentType: 'application/atom+xml' }))).toBe('xml');
    expect(bodyView(res({ contentType: 'image/png', text: undefined }))).toBe(
      'image',
    );
    expect(
      bodyView(res({ contentType: 'application/zip', text: undefined })),
    ).toBe('binary');
  });
  it('finds JWTs in headers and body', () => {
    const h = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxIn0', 'c2ln'].join('.');
    const b = ['eyJhbGciOiJub25lIn0', 'eyJ4IjoxfQ', ''].join('.');
    expect(
      findTokens(
        res({
          headers: [['authorization', `Bearer ${h}`]],
          text: `{"token":"${b}","again":"${h}"}`,
        }),
      ),
    ).toEqual([h, b]);
  });
});
