import { describe, expect, it } from 'vitest';
import { localCommands } from './local-commands';
import { DEFAULT_SPEC, type KeySpec } from './spec';

const spec = (s: Partial<KeySpec>): KeySpec => ({ ...DEFAULT_SPEC, ...s });
const commands = (s: Partial<KeySpec>, comment?: string) =>
  localCommands(spec(s), comment).map((c) => c.command);

describe('localCommands', () => {
  it('makes RSA keys of the chosen size, with ssh-keygen for signing keys', () => {
    expect(commands({ algorithm: 'RSASSA-PKCS1-v1_5', size: 3072 })).toEqual([
      'openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out private.pem',
      'openssl pkey -in private.pem -pubout -out public.pem',
      'ssh-keygen -t rsa -b 3072 -f id_rsa',
    ]);
    // Encryption keys have no OpenSSH form.
    expect(commands({ algorithm: 'RSA-OAEP', size: 2048 })).toHaveLength(2);
  });

  it('uses the RSA-PSS key type for RSA-PSS', () => {
    expect(commands({ algorithm: 'RSA-PSS', size: 4096 })[0]).toContain(
      '-algorithm RSA-PSS -pkeyopt rsa_keygen_bits:4096',
    );
  });

  it('names the curve for EC keys and its size for ssh-keygen', () => {
    const ec = commands({ algorithm: 'ECDSA', curve: 'P-384' });
    expect(ec[0]).toContain('ec_paramgen_curve:P-384');
    expect(ec[2]).toBe('ssh-keygen -t ecdsa -b 384 -f id_ecdsa');
    expect(commands({ algorithm: 'ECDH', curve: 'P-521' })).toHaveLength(2);
  });

  it('covers Ed25519 and X25519', () => {
    expect(commands({ algorithm: 'Ed25519' })[2]).toBe(
      'ssh-keygen -t ed25519 -f id_ed25519',
    );
    expect(commands({ algorithm: 'X25519' })[0]).toBe(
      'openssl genpkey -algorithm x25519 -out private.pem',
    );
  });

  it('shell-quotes the OpenSSH comment', () => {
    expect(commands({ algorithm: 'Ed25519' }, "it's me@host")[2]).toBe(
      `ssh-keygen -t ed25519 -C 'it'\\''s me@host' -f id_ed25519`,
    );
  });
});
