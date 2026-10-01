let counter = 0;

/**
 * A unique id. `crypto.randomUUID` only exists in secure contexts (https or
 * localhost), so plain-http LAN dev URLs fall back to time + counter +
 * random, which is unique enough for in-memory identities.
 */
export function newId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  counter++;
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2)}`;
}
