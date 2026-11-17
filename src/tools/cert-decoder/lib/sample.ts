import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { toPem } from '@/shared/lib/crypto/keys';

/*
 * Sample certificates built at runtime with pkijs and WebCrypto, so no
 * certificate or key material is committed: the unit tests and "Try an
 * example" use them. Each call makes fresh throwaway keys.
 */

export type KeyKind = 'ec' | 'rsa' | 'rsa-pss' | 'ed25519';

const GEN: Record<KeyKind, RsaHashedKeyGenParams | EcKeyGenParams | Algorithm> =
  {
    ec: { name: 'ECDSA', namedCurve: 'P-256' },
    rsa: {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    'rsa-pss': {
      name: 'RSA-PSS',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    ed25519: { name: 'Ed25519' },
  };

export const newKeys = (kind: KeyKind = 'ec') =>
  crypto.subtle.generateKey(GEN[kind], true, [
    'sign',
    'verify',
  ]) as Promise<CryptoKeyPair>;

export function rdn(cn: string, o?: string): pkijs.RelativeDistinguishedNames {
  const name = new pkijs.RelativeDistinguishedNames();
  const add = (type: string, value: string) =>
    name.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({
        type,
        value: new asn1js.Utf8String({ value }),
      }),
    );
  if (o) add('2.5.4.10', o);
  add('2.5.4.3', cn);
  return name;
}

const ext = (extnID: string, critical: boolean, value: asn1js.BaseBlock) =>
  new pkijs.Extension({ extnID, critical, extnValue: value.toBER(false) });

const gn = (type: 1 | 2 | 4 | 6 | 7, value: unknown) =>
  new pkijs.GeneralName({ type, value } as ConstructorParameters<
    typeof pkijs.GeneralName
  >[0]);

export interface CertOptions {
  subject: pkijs.RelativeDistinguishedNames;
  issuer: pkijs.RelativeDistinguishedNames;
  publicKey: CryptoKey;
  signingKey: CryptoKey;
  ca?: boolean;
  notBefore?: Date;
  notAfter?: Date;
  /** Leaf extensions: SAN, EKU, AIA, CRL and policies. */
  leaf?: boolean;
  serial?: number;
}

/** Signs a v3 certificate; ECDSA and RSA use SHA-256. */
export async function makeCert(o: CertOptions): Promise<pkijs.Certificate> {
  const cert = new pkijs.Certificate();
  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ value: o.serial ?? 4660 });
  cert.subject = o.subject;
  cert.issuer = o.issuer;
  cert.notBefore.value = o.notBefore ?? new Date(Date.now() - 86_400_000);
  cert.notAfter.value = o.notAfter ?? new Date(Date.now() + 90 * 86_400_000);
  await cert.subjectPublicKeyInfo.importKey(o.publicKey);
  const keyId = new Uint8Array(
    await crypto.subtle.digest(
      'SHA-1',
      cert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView.slice(),
    ),
  );
  cert.extensions = [
    ext(
      '2.5.29.19',
      true,
      new pkijs.BasicConstraints({
        cA: !!o.ca,
        ...(o.ca ? { pathLenConstraint: 0 } : {}),
      }).toSchema(),
    ),
    ext(
      '2.5.29.15',
      true,
      new asn1js.BitString({
        valueHex: new Uint8Array([o.ca ? 0x06 : 0xa0]).buffer,
        unusedBits: o.ca ? 1 : 5,
      }),
    ),
    ext('2.5.29.14', false, new asn1js.OctetString({ valueHex: keyId })),
  ];
  if (o.leaf)
    cert.extensions.push(
      ext(
        '2.5.29.17',
        false,
        new pkijs.AltName({
          altNames: [
            gn(2, 'example.test'),
            gn(2, '*.example.test'),
            gn(
              7,
              new asn1js.OctetString({
                valueHex: new Uint8Array([192, 0, 2, 1]),
              }),
            ),
            gn(1, 'admin@example.test'),
            gn(6, 'https://example.test/'),
          ],
        }).toSchema(),
      ),
      ext(
        '2.5.29.37',
        false,
        new pkijs.ExtKeyUsage({
          keyPurposes: ['1.3.6.1.5.5.7.3.1', '1.3.6.1.5.5.7.3.2'],
        }).toSchema(),
      ),
      ext(
        '1.3.6.1.5.5.7.1.1',
        false,
        new pkijs.InfoAccess({
          accessDescriptions: [
            new pkijs.AccessDescription({
              accessMethod: '1.3.6.1.5.5.7.48.1',
              accessLocation: gn(6, 'http://ocsp.example.test'),
            }),
            new pkijs.AccessDescription({
              accessMethod: '1.3.6.1.5.5.7.48.2',
              accessLocation: gn(6, 'http://ca.example.test/ca.crt'),
            }),
          ],
        }).toSchema(),
      ),
      ext(
        '2.5.29.31',
        false,
        new pkijs.CRLDistributionPoints({
          distributionPoints: [
            new pkijs.DistributionPoint({
              distributionPoint: [gn(6, 'http://crl.example.test/ca.crl')],
            }),
          ],
        }).toSchema(),
      ),
      ext(
        '2.5.29.32',
        false,
        new pkijs.CertificatePolicies({
          certificatePolicies: [
            new pkijs.PolicyInformation({ policyIdentifier: '2.23.140.1.2.1' }),
          ],
        }).toSchema(),
      ),
    );
  await cert.sign(o.signingKey, 'SHA-256');
  return cert;
}

export const der = (c: { toSchema(b?: boolean): asn1js.BaseBlock }) =>
  new Uint8Array(c.toSchema(true).toBER(false));

/** Root, intermediate and leaf: returned leaf first. */
export async function makeChain(kind: KeyKind = 'ec') {
  const rootKeys = await newKeys(kind);
  const midKeys = await newKeys(kind);
  const leafKeys = await newKeys(kind);
  const rootName = rdn('Test Root CA', 'Test Org');
  const midName = rdn('Test Intermediate CA', 'Test Org');
  const root = await makeCert({
    subject: rootName,
    issuer: rootName,
    publicKey: rootKeys.publicKey,
    signingKey: rootKeys.privateKey,
    ca: true,
    serial: 1,
  });
  const mid = await makeCert({
    subject: midName,
    issuer: rootName,
    publicKey: midKeys.publicKey,
    signingKey: rootKeys.privateKey,
    ca: true,
    serial: 2,
  });
  const leaf = await makeCert({
    subject: rdn('example.test', 'Test Org'),
    issuer: midName,
    publicKey: leafKeys.publicKey,
    signingKey: midKeys.privateKey,
    leaf: true,
    serial: 3,
  });
  return { root, mid, leaf, leafKeys };
}

/** A CSR asking for a SAN, signed with its own key. */
export async function makeCsr(kind: KeyKind = 'ec') {
  const keys = await newKeys(kind);
  const csr = new pkijs.CertificationRequest();
  csr.subject = rdn('csr.example.test', 'Test Org');
  await csr.subjectPublicKeyInfo.importKey(keys.publicKey);
  csr.attributes = [
    new pkijs.Attribute({
      type: '1.2.840.113549.1.9.14',
      values: [
        new pkijs.Extensions({
          extensions: [
            ext(
              '2.5.29.17',
              false,
              new pkijs.AltName({
                altNames: [gn(2, 'csr.example.test')],
              }).toSchema(),
            ),
          ],
        }).toSchema(),
      ],
    }),
  ];
  await csr.sign(keys.privateKey, 'SHA-256');
  return { csr, keys };
}

/** "Try an example": a fresh leaf, intermediate and root, as PEM. */
export async function sampleChainPem(): Promise<string> {
  const { leaf, mid, root } = await makeChain('ec');
  return [leaf, mid, root].map((c) => toPem('CERTIFICATE', der(c))).join('');
}
