import { key as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'keypair-generator',
  name: 'Key Pair Generator',
  description:
    'Generate RSA, ECDSA, ECDH, Ed25519 and X25519 key pairs as PEM, JWK and OpenSSH, with fingerprints',
  icon,
  category: 'security',
  slug: 'keys',
  kind: 'tool',
  keywords: [
    'key pair',
    'rsa',
    'ecdsa',
    'ed25519',
    'ssh key',
    'pem',
    'jwk',
    'public key',
    'private key',
    'ssh-keygen',
  ],
  version: '1.0.0',
  enabled: true,
  isNew: true,
  load: () => import('./Tool'),
});
