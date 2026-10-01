import { describe, expect, it } from 'vitest';
import { buildDefines, resolveSha } from '../build-info';

const noGit = () => {
  throw new Error('not a git repository');
};

describe('resolveSha', () => {
  it('prefers git', () => {
    expect(
      resolveSha({ git: () => 'a1b2c3d\n', env: { GITHUB_SHA: 'ffffffff' } }),
    ).toBe('a1b2c3d');
  });

  it('falls back to CI variables in order, shortened', () => {
    expect(
      resolveSha({
        git: noGit,
        env: {
          GITHUB_SHA: '3333333333',
          CF_PAGES_COMMIT_SHA: '2222222222',
          WORKERS_CI_COMMIT_SHA: '1111111111',
        },
      }),
    ).toBe('1111111');
    expect(
      resolveSha({
        git: noGit,
        env: { GITHUB_SHA: '3333333333', CF_PAGES_COMMIT_SHA: '2222222222' },
      }),
    ).toBe('2222222');
    expect(resolveSha({ git: noGit, env: { GITHUB_SHA: 'abcdef0123' } })).toBe(
      'abcdef0',
    );
  });

  it('gives up with an empty string', () => {
    expect(resolveSha({ git: noGit, env: {} })).toBe('');
  });

  it('works in this repo (git resolved from the file, not the cwd)', () => {
    expect(JSON.parse(buildDefines().__BUILD_SHA__)).toMatch(/^[0-9a-f]{7,}$/);
  });
});
