import { certificate as icon } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'cert-decoder',
  name: 'Certificate Decoder',
  description:
    'Decode X.509 certificates, chains, CSRs and keys: names, SANs, validity, extensions, fingerprints and signatures',
  icon,
  category: 'security',
  slug: 'certificate',
  kind: 'tool',
  keywords: [
    'certificate',
    'x509',
    'x.509',
    'ssl',
    'tls',
    'pem',
    'der',
    'csr',
    'certificate chain',
    'san',
    'fingerprint',
    'asn.1',
  ],
  accepts: [{ mimes: ['application/x-pem-file', 'application/pkix-cert'] }],
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
