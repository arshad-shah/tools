const VAR = /\\\{\{|\{\{\s*([\w.-]+)\s*\}\}/g;

/**
 * Replaces `{{name}}` (spaces inside the braces trimmed) with `vars[name]`.
 * `\{{` stays a literal `{{`. Unknown names are left in place and listed
 * once each in `unresolved`.
 */
export function interpolate(
  text: string,
  vars: Record<string, string>,
): { output: string; unresolved: string[] } {
  const unresolved = new Set<string>();
  const output = text.replace(VAR, (match, name: string | undefined) => {
    if (name === undefined) return '{{';
    if (Object.hasOwn(vars, name)) return vars[name];
    unresolved.add(name);
    return match;
  });
  return { output, unresolved: [...unresolved] };
}

export type EnvVar = {
  id: string;
  key: string;
  value: string;
  /** Secret values stay in memory unless the environment remembers them. */
  secret: boolean;
  /** Disabled variables are kept but not used; absent means enabled. */
  enabled?: boolean;
};

export type Environment = {
  id: string;
  name: string;
  vars: EnvVar[];
  /** "Remember secret values in this browser" (opt-in, D11). */
  rememberSecrets: boolean;
};

/** Secret values for environments that do not remember them. Never stored. */
const secretMemory = new Map<string, string>();
const memKey = (envId: string, varId: string) => `${envId}\u0000${varId}`;

/**
 * The environments as they may be stored: a secret value is emptied unless
 * its environment opted in, and kept in memory for this session instead.
 */
export function toStoredEnvironments(envs: Environment[]): Environment[] {
  return envs.map((env) => ({
    ...env,
    vars: env.vars.map((v) => {
      if (!v.secret || env.rememberSecrets) return { ...v };
      secretMemory.set(memKey(env.id, v.id), v.value);
      return { ...v, value: '' };
    }),
  }));
}

/** Stored environments with this session's secret values put back. */
export function withSessionSecrets(envs: Environment[]): Environment[] {
  return envs.map((env) => ({
    ...env,
    vars: env.vars.map((v) => {
      const mem = secretMemory.get(memKey(env.id, v.id));
      return v.secret && !env.rememberSecrets && mem !== undefined
        ? { ...v, value: mem }
        : v;
    }),
  }));
}

/** Forgets every in-memory secret value (Clear secrets). */
export function clearSessionSecrets(): void {
  secretMemory.clear();
}

/** The variable map for `interpolate`; later duplicates win, blank keys skipped. */
export function envVars(env: Environment | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of env?.vars ?? [])
    if (v.key.trim() && v.enabled !== false) out[v.key.trim()] = v.value;
  return out;
}
