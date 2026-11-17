/** Plain names for the object identifiers a certificate commonly holds. */

export const NAME_ATTRS: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.9': 'street',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'title',
  '2.5.4.15': 'businessCategory',
  '2.5.4.17': 'postalCode',
  '2.5.4.42': 'GN',
  '2.5.4.97': 'organizationIdentifier',
  '0.9.2342.19200300.100.1.25': 'DC',
  '0.9.2342.19200300.100.1.1': 'UID',
  '1.2.840.113549.1.9.1': 'E',
  '1.3.6.1.4.1.311.60.2.1.3': 'jurisdictionC',
  '1.3.6.1.4.1.311.60.2.1.2': 'jurisdictionST',
};

export const SIGNATURE_ALGS: Record<string, string> = {
  '1.2.840.113549.1.1.4': 'MD5 with RSA',
  '1.2.840.113549.1.1.5': 'SHA-1 with RSA',
  '1.2.840.113549.1.1.14': 'SHA-224 with RSA',
  '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
  '1.2.840.113549.1.1.12': 'SHA-384 with RSA',
  '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
  '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.10045.4.1': 'ECDSA with SHA-1',
  '1.2.840.10045.4.3.1': 'ECDSA with SHA-224',
  '1.2.840.10045.4.3.2': 'ECDSA with SHA-256',
  '1.2.840.10045.4.3.3': 'ECDSA with SHA-384',
  '1.2.840.10045.4.3.4': 'ECDSA with SHA-512',
  '1.3.101.112': 'Ed25519',
  '1.3.101.113': 'Ed448',
  '1.2.840.10040.4.3': 'DSA with SHA-1',
  '2.16.840.1.101.3.4.3.2': 'DSA with SHA-256',
};

export const KEY_ALGS: Record<string, string> = {
  '1.2.840.113549.1.1.1': 'RSA',
  '1.2.840.113549.1.1.10': 'RSA-PSS',
  '1.2.840.10045.2.1': 'EC',
  '1.3.101.110': 'X25519',
  '1.3.101.111': 'X448',
  '1.3.101.112': 'Ed25519',
  '1.3.101.113': 'Ed448',
  '1.2.840.10040.4.1': 'DSA',
  '1.2.840.113549.1.3.1': 'Diffie-Hellman',
};

export const CURVES: Record<string, { name: string; bits: number }> = {
  '1.2.840.10045.3.1.7': { name: 'P-256', bits: 256 },
  '1.3.132.0.34': { name: 'P-384', bits: 384 },
  '1.3.132.0.35': { name: 'P-521', bits: 521 },
  '1.3.132.0.10': { name: 'secp256k1', bits: 256 },
  '1.2.840.10045.3.1.1': { name: 'P-192', bits: 192 },
  '1.3.132.0.33': { name: 'P-224', bits: 224 },
  '1.3.36.3.3.2.8.1.1.7': { name: 'brainpoolP256r1', bits: 256 },
  '1.3.36.3.3.2.8.1.1.11': { name: 'brainpoolP384r1', bits: 384 },
  '1.3.36.3.3.2.8.1.1.13': { name: 'brainpoolP512r1', bits: 512 },
};

export const EXTENSIONS: Record<string, string> = {
  '2.5.29.14': 'Subject key identifier',
  '2.5.29.15': 'Key usage',
  '2.5.29.17': 'Subject alternative name',
  '2.5.29.18': 'Issuer alternative name',
  '2.5.29.19': 'Basic constraints',
  '2.5.29.30': 'Name constraints',
  '2.5.29.31': 'CRL distribution points',
  '2.5.29.32': 'Certificate policies',
  '2.5.29.35': 'Authority key identifier',
  '2.5.29.37': 'Extended key usage',
  '1.3.6.1.5.5.7.1.1': 'Authority information access',
  '1.3.6.1.5.5.7.1.11': 'Subject information access',
  '1.3.6.1.5.5.7.1.3': 'Qualified certificate statements',
  '1.3.6.1.5.5.7.1.24': 'TLS feature (OCSP must-staple)',
  '1.3.6.1.4.1.11129.2.4.2': 'Signed certificate timestamps (CT)',
  '1.3.6.1.4.1.11129.2.4.3': 'CT precertificate poison',
  '1.3.6.1.4.1.311.21.7': 'Microsoft certificate template',
  '1.3.6.1.4.1.311.20.2': 'Microsoft certificate template name',
  '2.16.840.1.113730.1.1': 'Netscape certificate type',
};

export const EKUS: Record<string, string> = {
  '1.3.6.1.5.5.7.3.1': 'TLS server authentication',
  '1.3.6.1.5.5.7.3.2': 'TLS client authentication',
  '1.3.6.1.5.5.7.3.3': 'Code signing',
  '1.3.6.1.5.5.7.3.4': 'Email protection',
  '1.3.6.1.5.5.7.3.8': 'Time stamping',
  '1.3.6.1.5.5.7.3.9': 'OCSP signing',
  '1.3.6.1.5.5.7.3.36': 'Document signing',
  '1.3.6.1.4.1.311.10.3.12': 'Microsoft document signing',
  '1.3.6.1.4.1.311.20.2.2': 'Microsoft smart card logon',
  '2.5.29.37.0': 'Any extended key usage',
};

export const KEY_USAGE_BITS = [
  'Digital signature',
  'Non-repudiation (content commitment)',
  'Key encipherment',
  'Data encipherment',
  'Key agreement',
  'Certificate signing',
  'CRL signing',
  'Encipher only',
  'Decipher only',
];

export const ACCESS_METHODS: Record<string, string> = {
  '1.3.6.1.5.5.7.48.1': 'OCSP',
  '1.3.6.1.5.5.7.48.2': 'CA issuers',
  '1.3.6.1.5.5.7.48.3': 'Time stamping',
  '1.3.6.1.5.5.7.48.5': 'CA repository',
};

export const POLICIES: Record<string, string> = {
  '2.5.29.32.0': 'Any policy',
  '2.23.140.1.1': 'Extended validation (CA/B Forum)',
  '2.23.140.1.2.1': 'Domain validated (CA/B Forum)',
  '2.23.140.1.2.2': 'Organization validated (CA/B Forum)',
  '2.23.140.1.2.3': 'Individual validated (CA/B Forum)',
  '2.23.140.1.3': 'EV code signing (CA/B Forum)',
  '2.23.140.1.4.1': 'Code signing (CA/B Forum)',
  '1.3.6.1.4.1.44947.1.1.1': "ISRG Domain Validated (Let's Encrypt)",
};

/** "Name (oid)" when the OID is known, else the OID alone. */
export const named = (table: Record<string, string>, oid: string) =>
  table[oid] ?? oid;
