export type AppStore = 'apple' | 'google';

export interface AppFields {
  store: AppStore;
  /** Apple: the numeric id (or id123); Google: the package name. */
  appId: string;
}

/** A store link that opens the app's page. */
export function appPayload(f: AppFields): string {
  const id = f.appId.trim();
  return f.store === 'apple'
    ? `https://apps.apple.com/app/id${id.replace(/^id/i, '')}`
    : `https://play.google.com/store/apps/details?id=${encodeURIComponent(id)}`;
}
