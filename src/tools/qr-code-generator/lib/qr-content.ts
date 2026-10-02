import {
  EncryptionConfig,
  QRCodeType,
  WifiData,
  ContactData,
  CryptoData,
} from '../types';
import CryptoJS from 'crypto-js';
import { toToolError } from '@/shared/lib/errors';

/**
 * Generates content for QR code based on the selected type
 */
export const generateQRContent = (
  qrType: QRCodeType,
  text: string,
  contactData: ContactData,
  wifiData: WifiData,
  cryptoData: CryptoData,
): string => {
  switch (qrType) {
    case 'url':
    case 'text':
    case 'custom':
      return text;
    case 'contact':
      return generateVCardFormat(contactData);
    case 'wifi':
      return generateWifiFormat(wifiData);
    case 'crypto':
      return generateCryptoFormat(cryptoData);
    default:
      return text;
  }
};

/**
 * Generates vCard format for contact information
 */
export const generateVCardFormat = (contactData: ContactData): string => {
  const { name, phone, email, company } = contactData;
  return `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL:${phone}
EMAIL:${email}
ORG:${company}
END:VCARD`;
};

/**
 * Generates WiFi network connection format
 */
export const generateWifiFormat = (wifiData: WifiData): string => {
  const { ssid, encryption, password, isHidden } = wifiData;
  return `WIFI:S:${ssid};T:${encryption};P:${password};H:${isHidden ? 'true' : 'false'};;`;
};

/**
 * Generates cryptocurrency payment format
 */
export const generateCryptoFormat = (cryptoData: CryptoData): string => {
  const { currency, publicKey, amount } = cryptoData;
  return `${currency.toLowerCase()}:${publicKey}${amount ? `?amount=${amount}` : ''}`;
};

/**
 * Applies selected encryption to the content. Throws if the cipher fails:
 * never falls back to the plaintext.
 */
export const encryptContent = (
  content: string,
  encryptionConfig: EncryptionConfig,
): string => {
  switch (encryptionConfig.type) {
    case 'none':
      return content;
    case 'aes':
      if (!encryptionConfig.key) return content;

      return CryptoJS.AES.encrypt(content, encryptionConfig.key, {
        iv: encryptionConfig.iv
          ? CryptoJS.enc.Utf8.parse(encryptionConfig.iv)
          : undefined,
        salt: encryptionConfig.salt ? encryptionConfig.salt : undefined,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString();
    case 'tripledes':
      if (!encryptionConfig.key) return content;

      return CryptoJS.TripleDES.encrypt(content, encryptionConfig.key, {
        iv: encryptionConfig.iv
          ? CryptoJS.enc.Utf8.parse(encryptionConfig.iv)
          : undefined,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString();
    case 'rc4':
      if (!encryptionConfig.key) return content;

      return CryptoJS.RC4.encrypt(content, encryptionConfig.key).toString();
    case 'rabbit':
      if (!encryptionConfig.key) return content;

      return CryptoJS.Rabbit.encrypt(content, encryptionConfig.key).toString();
    default:
      return content;
  }
};

/** The inputs that decide what a QR code encodes. */
export interface QrContentInput {
  qrType: QRCodeType;
  text: string;
  contactData: ContactData;
  wifiData: WifiData;
  cryptoData: CryptoData;
  encryptionConfig: EncryptionConfig;
}

/** What the QR code encodes, or why encryption failed (then nothing). */
export interface QrFinalData {
  data: string;
  error: string | null;
}

/**
 * The exact string the QR code encodes: the content for the selected type,
 * encrypted when an encryption method and key are set. If encryption fails
 * the data is empty and `error` says why; the plaintext is never encoded
 * in its place.
 */
export const buildFinalData = ({
  qrType,
  text,
  contactData,
  wifiData,
  cryptoData,
  encryptionConfig,
}: QrContentInput): QrFinalData => {
  const content = generateQRContent(
    qrType,
    text,
    contactData,
    wifiData,
    cryptoData,
  );
  try {
    return { data: encryptContent(content, encryptionConfig), error: null };
  } catch (e) {
    return {
      data: '',
      error: toToolError(e, 'Could not encrypt the QR code content').message,
    };
  }
};

/**
 * Generates a cryptographically secure random string of specified length
 * with no modulo bias
 */
export const generateRandomString = (length: number = 16): string => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charLength = characters.length;
  const maxByte = 256 - (256 % charLength); // This ensures an unbiased mapping

  let result = '';
  while (result.length < length) {
    const randomBytes = new Uint8Array(Math.ceil(length * 1.5)); // Get more bytes than needed to account for rejected values
    crypto.getRandomValues(randomBytes);

    for (let i = 0; i < randomBytes.length && result.length < length; i++) {
      // Skip values that would introduce bias
      if (randomBytes[i] < maxByte) {
        result += characters.charAt(randomBytes[i] % charLength);
      }
    }
  }

  return result;
};
