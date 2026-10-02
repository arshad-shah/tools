import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { ToolError } from '@/shared/lib/errors';
import { describeCertificate } from './cert-info';
import {
  importSigningKey,
  type SigningAlgorithm,
  type SigningIdentity,
} from './pkcs12';

export interface SelfSignedOptions {
  name: string;
  email?: string;
  organisation?: string;
  years: 1 | 3;
  keyType: 'ecdsa-p256' | 'rsa-2048';
}

const OID = {
  cn: '2.5.4.3',
  o: '2.5.4.10',
  email: '1.2.840.113549.1.9.1',
  basicConstraints: '2.5.29.19',
  keyUsage: '2.5.29.15',
  extKeyUsage: '2.5.29.37',
  subjectKeyId: '2.5.29.14',
  emailProtection: '1.3.6.1.5.5.7.3.4',
  documentSigning: '1.3.6.1.5.5.7.3.36',
  timeStamping: '1.3.6.1.5.5.7.3.8',
  keyBag: '1.2.840.113549.1.12.10.1.2',
  certBag: '1.2.840.113549.1.12.10.1.3',
  localKeyId: '1.2.840.113549.1.9.21',
  friendlyName: '1.2.840.113549.1.9.20',
} as const;

const KEY_GEN = {
  'ecdsa-p256': { name: 'ECDSA', namedCurve: 'P-256' },
  'rsa-2048': {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
} as const;

const SIGNING: Record<SelfSignedOptions['keyType'], SigningAlgorithm> = {
  'ecdsa-p256': { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' },
  'rsa-2048': { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
};

function rdn(o: SelfSignedOptions): pkijs.RelativeDistinguishedNames {
  const name = new pkijs.RelativeDistinguishedNames();
  const add = (type: string, value: asn1js.Utf8String | asn1js.IA5String) =>
    name.typesAndValues.push(new pkijs.AttributeTypeAndValue({ type, value }));
  add(OID.cn, new asn1js.Utf8String({ value: o.name }));
  if (o.organisation?.trim())
    add(OID.o, new asn1js.Utf8String({ value: o.organisation.trim() }));
  if (o.email?.trim())
    add(OID.email, new asn1js.IA5String({ value: o.email.trim() }));
  return name;
}

const ext = (extnID: string, critical: boolean, value: asn1js.BaseBlock) =>
  new pkijs.Extension({
    extnID,
    critical,
    extnValue: value.toBER(false),
  });

/** A positive 16-byte serial number (RFC 5280 §4.1.2.2). */
function serial(): asn1js.Integer {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[0] = (bytes[0] & 0x7f) | 0x01;
  return new asn1js.Integer({ valueHex: bytes.buffer });
}

/** Builds and signs an X.509 v3 certificate for `publicKey`. */
export async function buildCertificate(o: {
  subject: pkijs.RelativeDistinguishedNames;
  issuer: pkijs.RelativeDistinguishedNames;
  publicKey: CryptoKey;
  signingKey: CryptoKey;
  notBefore: Date;
  notAfter: Date;
  ca: boolean;
  hash?: 'SHA-256' | 'SHA-384';
  /** CA only: basicConstraints pathLenConstraint. */
  pathLen?: number;
  /** End entity only: a timestamp authority (critical id-kp-timeStamping). */
  timestamping?: boolean;
}): Promise<pkijs.Certificate> {
  const cert = new pkijs.Certificate();
  cert.version = 2;
  cert.serialNumber = serial();
  cert.subject = o.subject;
  cert.issuer = o.issuer;
  cert.notBefore.value = o.notBefore;
  cert.notAfter.value = o.notAfter;
  await cert.subjectPublicKeyInfo.importKey(o.publicKey);
  const keyId = new Uint8Array(
    await crypto.subtle.digest(
      'SHA-1',
      cert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView.slice(),
    ),
  );
  // keyUsage: digitalSignature (bit 0) and nonRepudiation (bit 1); a CA also
  // gets keyCertSign (bit 5).
  const usage = o.ca ? 0xc4 : 0xc0;
  cert.extensions = [
    ext(
      OID.basicConstraints,
      true,
      new pkijs.BasicConstraints({
        cA: o.ca,
        ...(o.ca && o.pathLen !== undefined
          ? { pathLenConstraint: o.pathLen }
          : {}),
      }).toSchema(),
    ),
    ext(
      OID.keyUsage,
      true,
      new asn1js.BitString({
        valueHex: new Uint8Array([usage]).buffer,
        unusedBits: o.ca ? 2 : 6,
      }),
    ),
    ext(OID.subjectKeyId, false, new asn1js.OctetString({ valueHex: keyId })),
  ];
  if (!o.ca)
    cert.extensions.push(
      ext(
        OID.extKeyUsage,
        !!o.timestamping,
        new pkijs.ExtKeyUsage({
          keyPurposes: o.timestamping
            ? [OID.timeStamping]
            : [OID.emailProtection, OID.documentSigning],
        }).toSchema(),
      ),
    );
  await cert.sign(o.signingKey, o.hash ?? 'SHA-256');
  return cert;
}

/**
 * A new key pair and a self-signed certificate (valid from 5 minutes ago,
 * for 1 or 3 years). `exportable` is kept only so the user can download a
 * .p12 in the same dialog; signing uses a non-extractable copy.
 */
export async function createSelfSigned(
  o: SelfSignedOptions,
): Promise<SigningIdentity & { exportable: CryptoKeyPair }> {
  if (!o.name.trim())
    throw new ToolError(
      'INVALID_INPUT',
      'Enter the name to put on the certificate',
    );
  const pair = (await crypto.subtle.generateKey(KEY_GEN[o.keyType], true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const name = rdn({ ...o, name: o.name.trim() });
  const now = Date.now();
  const notAfter = new Date(now);
  notAfter.setFullYear(notAfter.getFullYear() + o.years);
  const certificate = await buildCertificate({
    subject: name,
    issuer: name,
    publicKey: pair.publicKey,
    signingKey: pair.privateKey,
    notBefore: new Date(now - 5 * 60_000),
    notAfter,
    ca: false,
  });
  const algorithm = SIGNING[o.keyType];
  const privateKey = await importSigningKey(
    new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey)),
    algorithm,
  );
  return {
    privateKey,
    algorithm,
    certificate,
    chain: [],
    info: describeCertificate(certificate),
    exportable: pair,
  };
}

const PBE = {
  contentEncryptionAlgorithm: { name: 'AES-CBC', length: 256 },
  hmacHashAlgorithm: 'SHA-256',
  iterationCount: 210_000,
};
/** MAC iterations (integrity only; OpenSSL's default). */
const MAC_ITERATIONS = 2048;

/**
 * A .p12 with PBES2 (PBKDF2-HMAC-SHA256, 210 000 iterations, AES-256-CBC)
 * for both bags and an HMAC-SHA256 MAC. The password must have at least 8
 * characters; its bytes are zero-filled afterwards.
 */
export async function exportPkcs12(
  id: { certificate: pkijs.Certificate; keyPair: CryptoKeyPair },
  password: string,
): Promise<Uint8Array> {
  if (password.length < 8)
    throw new ToolError(
      'INVALID_INPUT',
      'Use a password of at least 8 characters for the certificate file',
    );
  const pw = new TextEncoder().encode(password);
  const pkcs8 = new Uint8Array(
    await crypto.subtle.exportKey('pkcs8', id.keyPair.privateKey),
  );
  try {
    const password = pw.buffer as ArrayBuffer;
    const keyId = new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        id.certificate.toSchema(true).toBER(false),
      ),
    );
    const attrs = () => [
      new pkijs.Attribute({
        type: OID.localKeyId,
        values: [new asn1js.OctetString({ valueHex: keyId })],
      }),
      new pkijs.Attribute({
        type: OID.friendlyName,
        values: [
          new asn1js.BmpString({
            value: describeCertificateName(id.certificate),
          }),
        ],
      }),
    ];
    const keyBag = new pkijs.PKCS8ShroudedKeyBag({
      parsedValue: pkijs.PrivateKeyInfo.fromBER(pkcs8.buffer),
    });
    await keyBag.makeInternalValues({ password, ...PBE } as Parameters<
      pkijs.PKCS8ShroudedKeyBag['makeInternalValues']
    >[0]);
    const safe = new pkijs.AuthenticatedSafe({
      parsedValue: {
        safeContents: [
          {
            privacyMode: 0,
            value: new pkijs.SafeContents({
              safeBags: [
                new pkijs.SafeBag({
                  bagId: OID.keyBag,
                  bagValue: keyBag,
                  bagAttributes: attrs(),
                }),
              ],
            }),
          },
          {
            privacyMode: 1,
            value: new pkijs.SafeContents({
              safeBags: [
                new pkijs.SafeBag({
                  bagId: OID.certBag,
                  bagValue: new pkijs.CertBag({ parsedValue: id.certificate }),
                  bagAttributes: attrs(),
                }),
              ],
            }),
          },
        ],
      },
    });
    await safe.makeInternalValues({
      safeContents: [{}, { password, ...PBE }],
    });
    const pfx = new pkijs.PFX({
      parsedValue: { integrityMode: 0, authenticatedSafe: safe },
    });
    await pfx.makeInternalValues({
      password,
      iterations: MAC_ITERATIONS,
      pbkdf2HashAlgorithm: { name: 'SHA-256' },
      hmacHashAlgorithm: 'SHA-256',
    });
    return new Uint8Array(pfx.toSchema().toBER(false));
  } finally {
    pw.fill(0);
    pkcs8.fill(0);
  }
}

const describeCertificateName = (c: pkijs.Certificate) =>
  describeCertificate(c).subjectCN || 'Signing certificate';
