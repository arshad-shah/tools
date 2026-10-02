/*
 * A minimal RFC 3161 timestamp authority for tests (Node and Playwright
 * routes): answers a TimeStampReq with a granted TimeStampResp signed by a
 * throwaway ECDSA key generated at runtime.
 */
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { buildCertificate } from '../../src/pdf/sign/pades/self-signed';

const TST_INFO = '1.2.840.113549.1.9.16.1.4';

export interface TestTsa {
  /** Handles one request body; returns the response body. */
  respond(body: Uint8Array): Promise<Uint8Array>;
  certificate: pkijs.Certificate;
}

export interface TestTsaOptions {
  /** Answer with a different nonce than the request's. */
  tamperNonce?: boolean;
  /** Answer with status rejection (2). */
  reject?: boolean;
  genTime?: Date;
}

const name = (cn: string) => {
  const n = new pkijs.RelativeDistinguishedNames();
  n.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: '2.5.4.3',
      value: new asn1js.Utf8String({ value: cn }),
    }),
  );
  return n;
};

export async function makeTestTsa(o: TestTsaOptions = {}): Promise<TestTsa> {
  const keys = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const certificate = await buildCertificate({
    subject: name('Test TSA'),
    issuer: name('Test TSA'),
    publicKey: keys.publicKey,
    signingKey: keys.privateKey,
    notBefore: new Date(Date.now() - 86_400_000),
    notAfter: new Date(Date.now() + 86_400_000 * 30),
    ca: false,
  });
  let serial = 1;
  return {
    certificate,
    async respond(body) {
      const req = pkijs.TimeStampReq.fromBER(body.slice().buffer);
      if (o.reject)
        return new Uint8Array(
          new pkijs.TimeStampResp({
            status: new pkijs.PKIStatusInfo({ status: 2 }),
          })
            .toSchema()
            .toBER(false),
        );
      let nonce = req.nonce;
      if (o.tamperNonce && nonce) {
        const v = new Uint8Array(nonce.valueBlock.valueHexView).slice();
        v[v.length - 1] ^= 0x01;
        nonce = new asn1js.Integer({ valueHex: v });
      }
      const tst = new pkijs.TSTInfo({
        version: 1,
        policy: '1.3.6.1.4.1.99999.1',
        messageImprint: req.messageImprint,
        serialNumber: new asn1js.Integer({ value: serial++ }),
        genTime: o.genTime ?? new Date(),
        ...(nonce ? { nonce } : {}),
      });
      const tstDer = tst.toSchema().toBER(false);
      const digest = await crypto.subtle.digest('SHA-256', tstDer);
      const signed = new pkijs.SignedData({
        version: 3,
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
          eContentType: TST_INFO,
          eContent: new asn1js.OctetString({ valueHex: tstDer }),
        }),
        signerInfos: [
          new pkijs.SignerInfo({
            version: 1,
            sid: new pkijs.IssuerAndSerialNumber({
              issuer: certificate.issuer,
              serialNumber: certificate.serialNumber,
            }),
            signedAttrs: new pkijs.SignedAndUnsignedAttributes({
              type: 0,
              attributes: [
                new pkijs.Attribute({
                  type: '1.2.840.113549.1.9.3',
                  values: [new asn1js.ObjectIdentifier({ value: TST_INFO })],
                }),
                new pkijs.Attribute({
                  type: '1.2.840.113549.1.9.4',
                  values: [new asn1js.OctetString({ valueHex: digest })],
                }),
              ],
            }),
          }),
        ],
        certificates: req.certReq ? [certificate] : [],
      });
      await signed.sign(keys.privateKey, 0, 'SHA-256');
      return new Uint8Array(
        new pkijs.TimeStampResp({
          status: new pkijs.PKIStatusInfo({ status: 0 }),
          timeStampToken: new pkijs.ContentInfo({
            contentType: '1.2.840.113549.1.7.2',
            content: signed.toSchema(true),
          }),
        })
          .toSchema()
          .toBER(false),
      );
    },
  };
}

/** A fetch stand-in that routes POSTs to the test TSA. */
export function tsaFetch(tsa: TestTsa): typeof fetch {
  return (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = new Uint8Array(init!.body as Uint8Array);
    const out = await tsa.respond(body);
    return new Response(out as Uint8Array<ArrayBuffer>, {
      status: 200,
      headers: { 'Content-Type': 'application/timestamp-reply' },
    });
  }) as typeof fetch;
}
