import { describe, expect, it } from 'vitest';
import { detectFormat } from './detect';
import { access, docker, jsonl, logfmt, plain, syslog } from './index';

const PINO = [
  '{"level":30,"time":1700000000000,"pid":1,"hostname":"h","msg":"server started"}',
  '{"level":50,"time":1700000001000,"pid":1,"hostname":"h","msg":"boom","err":{"type":"Error"}}',
  '{"level":40,"time":1700000002000,"pid":1,"hostname":"h","msg":"slow"}',
];
const NGINX = [
  '203.0.113.9 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326 "https://example.com/" "Mozilla/5.0"',
  '203.0.113.9 - bob [10/Oct/2023:13:55:37 +0000] "POST /api HTTP/1.1" 502 17 "-" "curl/8.0"',
];
const SYSLOG_5424 = [
  '<165>1 2003-10-11T22:14:15.003Z mymachine.example.com evntslog - ID47 [exampleSDID@32473 iut="3"] An application event',
  '<11>1 2003-10-11T22:14:16.003Z mymachine.example.com evntslog 99 - - Disk failure',
];

describe('detectFormat', () => {
  it('picks jsonl for pino', () => {
    expect(detectFormat(PINO)[0].id).toBe('jsonl');
  });
  it('picks access for nginx', () => {
    expect(detectFormat(NGINX)[0].id).toBe('access');
  });
  it('picks syslog for RFC 5424', () => {
    expect(detectFormat(SYSLOG_5424)[0].id).toBe('syslog');
  });
  it('picks logfmt, docker and a legacy format', () => {
    expect(detectFormat(['ts=1 level=info msg="hi there" a=1'])[0].id).toBe(
      'logfmt',
    );
    expect(
      detectFormat([
        '2024-01-01T00:00:00.1Z stdout F {"level":"info","msg":"x"}',
      ])[0].id,
    ).toBe('docker');
    expect(
      detectFormat([
        '[2024-01-15 08:23:45,123] INFO django.request: Request started',
      ])[0].id,
    ).toBe('django');
  });
  it('does not read plain ISO-stamped lines as docker', () => {
    expect(detectFormat(['2024-01-01T00:00:00.000Z INFO started'])[0].id).toBe(
      'plain',
    );
    expect(
      detectFormat(['2024-01-01T00:00:00.123456789Z level=info msg=x a=b'])[0]
        .id,
    ).toBe('docker');
  });
  it('falls back to plain', () => {
    expect(detectFormat(['just words', 'more words'])[0].id).toBe('plain');
    expect(detectFormat([])[0].id).toBe('plain');
  });
});

describe('jsonl', () => {
  it('maps pino numeric levels, msg and epoch time', () => {
    expect(jsonl.parse('{"level":30,"msg":"hi","time":1700000000000}')).toEqual(
      {
        level: 'info',
        message: 'hi',
        ts: 1700000000000,
        component: undefined,
        fields: {},
      },
    );
    expect(jsonl.parse('{"level":50,"msg":"x"}')!.level).toBe('error');
  });
  it('maps ECS, bunyan and Serilog keys', () => {
    const ecs = jsonl.parse(
      '{"@timestamp":"2024-01-01T00:00:00Z","log":{"level":"warn","logger":"db"},"message":"slow"}',
    )!;
    expect(ecs).toMatchObject({
      level: 'warn',
      message: 'slow',
      ts: Date.UTC(2024, 0, 1),
    });
    const serilog = jsonl.parse(
      '{"@t":"2024-01-01T00:00:00Z","@l":"Error","@mt":"Failed {Id}","Id":7}',
    )!;
    expect(serilog).toMatchObject({
      level: 'error',
      message: 'Failed {Id}',
      fields: { Id: '7' },
    });
    expect(
      jsonl.parse('{"severity":"ERROR","message":"m","ts":1700000000}')!.ts,
    ).toBe(1700000000000);
  });
  it('refuses non-JSON', () => {
    expect(jsonl.parse('{nope')).toBeNull();
    expect(jsonl.parse('[1]')).toBeNull();
  });
});

describe('access', () => {
  it('reads the combined fields', () => {
    const e = access.parse(NGINX[0])!;
    expect(e.fields).toMatchObject({
      status: '200',
      method: 'GET',
      path: '/index.html',
      bytes: '2326',
      ua: 'Mozilla/5.0',
    });
    expect(e.ts).toBe(Date.UTC(2023, 9, 10, 13, 55, 36));
    expect(e.level).toBe('info');
    expect(access.parse(NGINX[1])!.level).toBe('error');
  });
});

describe('syslog', () => {
  it('reads RFC 5424 and RFC 3164', () => {
    const e = syslog.parse(SYSLOG_5424[1])!;
    expect(e).toMatchObject({
      level: 'error',
      component: 'evntslog',
      message: 'Disk failure',
    });
    const bsd = syslog.parse(
      '<34>Oct 11 22:14:15 mymachine su[230]: su root failed',
    )!;
    expect(bsd).toMatchObject({
      level: 'fatal',
      component: 'su',
      message: 'su root failed',
    });
    expect(bsd.fields).toMatchObject({ host: 'mymachine', pid: '230' });
  });
});

describe('logfmt', () => {
  it('reads quoted values', () => {
    expect(
      logfmt.parse(
        'time=2024-01-01T00:00:00Z level=warn msg="disk \\"a\\" full" pct=91',
      ),
    ).toEqual({
      level: 'warn',
      message: 'disk "a" full',
      ts: Date.UTC(2024, 0, 1),
      component: undefined,
      fields: { pct: '91' },
    });
    expect(logfmt.parse('just a sentence with a=b in it')).toBeNull();
  });
});

describe('docker', () => {
  it('strips CRI and kubectl prefixes into fields', () => {
    const cri = docker.parse(
      '2024-01-01T00:00:00.5Z stderr F level=error msg=boom',
    )!;
    expect(cri).toMatchObject({
      level: 'error',
      message: 'boom',
      fields: { stream: 'stderr' },
    });
    expect(cri.ts).toBe(Date.UTC(2024, 0, 1, 0, 0, 0, 500));
    const k = docker.parse('[pod/web-1/nginx] [ERROR] upstream down')!;
    expect(k).toMatchObject({
      level: 'error',
      fields: { pod: 'web-1', container: 'nginx' },
    });
    const j = docker.parse(
      '{"log":"hello\\n","stream":"stdout","time":"2024-01-01T00:00:00Z"}',
    )!;
    expect(j).toMatchObject({ message: 'hello', fields: { stream: 'stdout' } });
  });
});

describe('plain', () => {
  it('reads an anchored level and a leading timestamp', () => {
    expect(plain.parse('2024-01-01 00:00:01 ERROR x')).toMatchObject({
      level: 'error',
      ts: Date.UTC(2024, 0, 1, 0, 0, 1),
    });
    expect(plain.parse('processed 10 items, errors=0')!.level).toBeUndefined();
  });
});
