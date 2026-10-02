import CryptoJS from 'crypto-js';
import { describe, expect, it, vi } from 'vitest';
import type {
  ContactData,
  CryptoData,
  EncryptionConfig,
  WifiData,
} from '../types';
import {
  buildFinalData,
  encryptContent,
  generateCryptoFormat,
  generateQRContent,
  generateRandomString,
  generateVCardFormat,
  generateWifiFormat,
  type QrContentInput,
} from './qr-content';

const blankContact: ContactData = {
  name: '',
  phone: '',
  email: '',
  company: '',
};
const blankWifi: WifiData = {
  ssid: '',
  password: '',
  encryption: '',
  isHidden: false,
};
const blankCrypto: CryptoData = { currency: 'BTC', publicKey: '', amount: '' };
const none: EncryptionConfig = { type: 'none', key: '' };

describe('qr content formats', () => {
  it('wifi', () => {
    expect(
      generateWifiFormat({
        ssid: 'Home',
        password: 'pw',
        encryption: 'WPA',
        isHidden: true,
      }),
    ).toBe('WIFI:S:Home;T:WPA;P:pw;H:true;;');
    expect(generateWifiFormat({ ...blankWifi, ssid: 'X' })).toBe(
      'WIFI:S:X;T:;P:;H:false;;',
    );
  });

  it('vcard', () => {
    expect(
      generateVCardFormat({
        name: 'Ada',
        phone: '1',
        email: 'a@x',
        company: 'X',
      }),
    ).toBe(
      'BEGIN:VCARD\nVERSION:3.0\nFN:Ada\nTEL:1\nEMAIL:a@x\nORG:X\nEND:VCARD',
    );
  });

  it('crypto with and without amount', () => {
    expect(
      generateCryptoFormat({ currency: 'BTC', publicKey: 'k', amount: '0.1' }),
    ).toBe('btc:k?amount=0.1');
    expect(
      generateCryptoFormat({ currency: 'ETH', publicKey: 'k', amount: '' }),
    ).toBe('eth:k');
  });

  it('url/text/custom pass text through; other types ignore text', () => {
    for (const t of ['url', 'text', 'custom'] as const) {
      expect(
        generateQRContent(t, 'https://x', blankContact, blankWifi, blankCrypto),
      ).toBe('https://x');
    }
    expect(
      generateQRContent(
        'wifi',
        'ignored',
        blankContact,
        blankWifi,
        blankCrypto,
      ),
    ).toBe('WIFI:S:;T:;P:;H:false;;');
    expect(
      generateQRContent(
        'crypto',
        'ignored',
        blankContact,
        blankWifi,
        blankCrypto,
      ),
    ).toBe('btc:');
    expect(
      generateQRContent(
        'contact',
        'ignored',
        blankContact,
        blankWifi,
        blankCrypto,
      ),
    ).toBe('BEGIN:VCARD\nVERSION:3.0\nFN:\nTEL:\nEMAIL:\nORG:\nEND:VCARD');
  });
});

describe('encryptContent', () => {
  it('passes content through for none or a missing key', () => {
    expect(encryptContent('hi', none)).toBe('hi');
    for (const type of ['aes', 'tripledes', 'rc4', 'rabbit'] as const) {
      expect(encryptContent('hi', { type, key: '' })).toBe('hi');
    }
  });

  it('encrypts with a key so the same key decrypts it', () => {
    const rc4 = encryptContent('hello', { type: 'rc4', key: 'k' });
    expect(rc4).not.toBe('hello');
    expect(CryptoJS.RC4.decrypt(rc4, 'k').toString(CryptoJS.enc.Utf8)).toBe(
      'hello',
    );
    const aes = encryptContent('hello', { type: 'aes', key: 'k' });
    expect(aes).not.toBe('hello');
    expect(CryptoJS.AES.decrypt(aes, 'k').toString(CryptoJS.enc.Utf8)).toBe(
      'hello',
    );
  });

  it('throws instead of falling back to the plaintext', () => {
    vi.spyOn(CryptoJS.TripleDES, 'encrypt').mockImplementation(() => {
      throw new Error('cipher broke');
    });
    expect(() =>
      encryptContent('secret', { type: 'tripledes', key: 'k' }),
    ).toThrow('cipher broke');
  });
});

describe('generateRandomString', () => {
  it('returns the requested length from the alphanumeric alphabet', () => {
    expect(generateRandomString(16)).toMatch(/^[A-Za-z0-9]{16}$/);
    expect(generateRandomString(8)).toMatch(/^[A-Za-z0-9]{8}$/);
  });
});

describe('buildFinalData', () => {
  const base: QrContentInput = {
    qrType: 'url',
    text: 'https://example.com',
    contactData: blankContact,
    wifiData: blankWifi,
    cryptoData: blankCrypto,
    encryptionConfig: none,
  };

  it('is the generated content when encryption is off', () => {
    expect(buildFinalData(base)).toEqual({
      data: 'https://example.com',
      error: null,
    });
    expect(
      buildFinalData({
        ...base,
        qrType: 'wifi',
        wifiData: { ...blankWifi, ssid: 'Home', encryption: 'WPA' },
      }),
    ).toEqual({ data: 'WIFI:S:Home;T:WPA;P:;H:false;;', error: null });
  });

  it('encrypts the generated content when a key is set', () => {
    const { data: out, error } = buildFinalData({
      ...base,
      encryptionConfig: { type: 'rc4', key: 'k' },
    });
    expect(error).toBeNull();
    expect(CryptoJS.RC4.decrypt(out, 'k').toString(CryptoJS.enc.Utf8)).toBe(
      'https://example.com',
    );
  });

  it('encodes nothing and reports the error when encryption fails', () => {
    vi.spyOn(CryptoJS.AES, 'encrypt').mockImplementation(() => {
      throw new Error('cipher broke');
    });
    const errorLog = vi.spyOn(console, 'error');
    const out = buildFinalData({
      ...base,
      encryptionConfig: { type: 'aes', key: 'k' },
    });
    expect(out).toEqual({ data: '', error: 'cipher broke' });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('gives a fallback message when the failure has none', () => {
    vi.spyOn(CryptoJS.RC4, 'encrypt').mockImplementation(() => {
      throw 'x';
    });
    expect(
      buildFinalData({ ...base, encryptionConfig: { type: 'rc4', key: 'k' } }),
    ).toEqual({ data: '', error: 'Could not encrypt the QR code content' });
  });
});
