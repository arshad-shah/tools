/**
 * Data-never-persisted guard (spec §4.5): a tool's settings shape must not
 * hold inputs, outputs or secrets. Each tool's settings test calls this on
 * its defaults.
 */
const EXACT = /^(input|text|token|secret|password|key|body|data|value)$/i;
const SUFFIX = /(Input|Token|Secret|Password)$/;

export function assertNoDataFields(defaults: object): void {
  const bad = Object.keys(defaults).filter(
    (k) => EXACT.test(k) || SUFFIX.test(k),
  );
  if (bad.length > 0)
    throw new Error(
      `Settings must not persist data fields: ${bad.join(', ')} (spec 4.5)`,
    );
}
