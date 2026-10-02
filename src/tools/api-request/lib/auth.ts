import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';
import { withParams } from './query';
import type { Auth } from './model';

export interface AuthTarget {
  url: string;
  headers: Headers;
}

/** Adds the auth helper's header or query param; it overrides a typed one. */
export function applyAuth(target: AuthTarget, auth: Auth): AuthTarget {
  const headers = new Headers(target.headers);
  let url = target.url;
  switch (auth.kind) {
    case 'bearer':
      if (auth.token) headers.set('authorization', `Bearer ${auth.token}`);
      break;
    case 'basic':
      headers.set(
        'authorization',
        `Basic ${bytesToBase64(utf8Encode(`${auth.user}:${auth.pass}`))}`,
      );
      break;
    case 'apikey':
      if (auth.name.trim()) {
        if (auth.in === 'header') headers.set(auth.name.trim(), auth.value);
        else url = withParams(url, [[auth.name.trim(), auth.value]]);
      }
      break;
    case 'none':
      break;
  }
  return { url, headers };
}

/** The auth with each text field passed through `fill`. */
export function fillAuth(auth: Auth, fill: (s: string) => string): Auth {
  switch (auth.kind) {
    case 'bearer':
      return { ...auth, token: fill(auth.token) };
    case 'basic':
      return { ...auth, user: fill(auth.user), pass: fill(auth.pass) };
    case 'apikey':
      return { ...auth, name: fill(auth.name), value: fill(auth.value) };
    case 'none':
      return auth;
  }
}
