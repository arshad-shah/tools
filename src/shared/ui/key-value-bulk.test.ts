import { describe, expect, it } from 'vitest';
import { fromBulkText, toBulkText } from './key-value-bulk';
import type { KeyValueRow } from './key-value-bulk';

const rows: KeyValueRow[] = [
  { id: 'a', enabled: true, key: 'Accept', value: 'application/json' },
  { id: 'b', enabled: false, key: 'X-Trace', value: 'off' },
  { id: 'c', enabled: true, key: 'Accept', value: 'text/plain' },
];

describe('toBulkText', () => {
  it('writes key: value lines and prefixes disabled rows with a hash', () => {
    expect(toBulkText(rows)).toBe(
      'Accept: application/json\n# X-Trace: off\nAccept: text/plain',
    );
  });

  it('writes a file row as its file name', () => {
    const file = new File(['x'], 'photo.png');
    expect(
      toBulkText([
        {
          id: 'f',
          enabled: true,
          key: 'upload',
          value: '',
          type: 'file',
          file,
        },
      ]),
    ).toBe('upload: photo.png');
  });
});

describe('fromBulkText', () => {
  it('round-trips rows, keeping disabled rows, duplicates and ids', () => {
    expect(fromBulkText(toBulkText(rows), rows)).toEqual(rows);
  });

  it('splits on the first colon only and trims around it', () => {
    const [row] = fromBulkText('  Host :  example.com:8080  ', []);
    expect(row.key).toBe('Host');
    expect(row.value).toBe('example.com:8080');
    expect(row.enabled).toBe(true);
    expect(row.id).toBeTruthy();
  });

  it('reads a line without a colon as a key with an empty value', () => {
    const [row] = fromBulkText('# token', []);
    expect(row).toMatchObject({ enabled: false, key: 'token', value: '' });
  });

  it('skips blank lines', () => {
    expect(fromBulkText('\n\na: 1\n   \n', [])).toHaveLength(1);
  });

  it('keeps type, file and description when the key at that index is unchanged', () => {
    const file = new File(['x'], 'photo.png');
    const prev: KeyValueRow[] = [
      {
        id: 'f',
        enabled: true,
        key: 'upload',
        value: '',
        type: 'file',
        file,
        description: 'Avatar',
      },
      { id: 's', enabled: true, key: 'token', value: 'abc', type: 'secret' },
    ];
    const next = fromBulkText('upload: photo.png\nother: abc', prev);
    expect(next[0]).toEqual(prev[0]);
    expect(next[1]).toEqual({
      id: 's',
      enabled: true,
      key: 'other',
      value: 'abc',
    });
  });
});
