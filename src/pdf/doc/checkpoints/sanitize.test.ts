import { describe, expect, it } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { makeScriptedPdf } from '../../../../test/fixtures/protect';
import { sanitizeDoc } from '@/pdf/edit/sanitize';
import type { SanitizeParams } from '../ops/protect';
import { inProcessServices } from '../test-services';
import { makeModel } from '../test-helpers';
import { sanitizeRunner } from './sanitize';

const ALL: SanitizeParams = {
  scripts: true,
  attachments: true,
  links: true,
  metadata: true,
  hiddenLayers: true,
};

const env = () => {
  const calls: string[] = [];
  const services = inProcessServices({
    edit: {
      async call(method: string, args: unknown[]) {
        calls.push(method);
        return sanitizeDoc(args[0] as Uint8Array, args[1] as never);
      },
    } as never,
  });
  return {
    calls,
    env: {
      services,
      signal: new AbortController().signal,
      progress: () => {},
    },
  };
};

describe('sanitize runner', () => {
  it('runs the edit-worker handler and reports what went', async () => {
    const { calls, env: e } = env();
    const out = await sanitizeRunner.run(
      {
        bytes: await makeScriptedPdf(),
        params: ALL,
        assets: {},
        view: makeModel().getView(),
      },
      e,
    );
    expect(calls).toEqual(['sanitize']);
    expect(out.report.title).toMatch(
      /^Sanitised: \d+ kinds of content removed$/,
    );
    expect(out.report.lines).toContain('Open action');
    expect(out.report.warnings).toEqual([]);
  });

  it('refuses when there is nothing to remove', async () => {
    const { env: e } = env();
    await expect(
      sanitizeRunner.run(
        {
          bytes: await makeTextPdf({ pages: 1 }),
          params: { ...ALL, metadata: false },
          assets: {},
          view: makeModel().getView(),
        },
        e,
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'This document has none of the chosen content to remove',
    });
  });
});
