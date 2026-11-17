import { describe, expect, it } from 'vitest';
import { emptyBuilder, fromBuilder, toBuilder } from './builder';
import { parseCurl } from './parse';

const req = (cmd: string) => parseCurl(cmd).request;

describe('builder', () => {
  it('round-trips parsed requests', () => {
    for (const cmd of [
      `curl -X PATCH https://x.test/a -H 'A: 1' -d '{"a":1}' -u u:p -k -L --compressed -b 's=1'`,
      `curl -F a=1 -F 'f=@x.png;type=image/png;filename=y.png' https://x.test`,
      'curl -T big.iso https://x.test/up',
      'curl --data-binary @body.bin https://x.test',
      'curl https://x.test',
    ]) {
      const r = req(cmd);
      expect(fromBuilder(toBuilder(r))).toEqual(r);
    }
  });

  it('leaves out switched-off and unnamed rows', () => {
    const s = toBuilder(req("curl -H 'A: 1' -H 'B: 2' https://x.test"));
    s.headers[0].enabled = false;
    s.headers.push({ id: 'z', key: ' ', value: 'x', enabled: true });
    expect(fromBuilder(s).headers).toEqual([{ name: 'B', value: '2' }]);
  });

  it('adds a scheme and defaults the method', () => {
    const s = { ...emptyBuilder(), url: 'example.com/x', method: ' ' };
    expect(fromBuilder(s)).toMatchObject({
      url: 'http://example.com/x',
      method: 'GET',
    });
  });

  it('an empty text body or file path sends no body', () => {
    const s = { ...emptyBuilder(), bodyKind: 'text' as const, text: '' };
    expect(fromBuilder(s).body).toEqual({ kind: 'none' });
    expect(fromBuilder({ ...s, bodyKind: 'file' }).body).toEqual({
      kind: 'none',
    });
  });
});
