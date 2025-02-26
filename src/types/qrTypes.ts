// types/qrTypes.ts

export type QRCodeType = 'url' | 'text' | 'contact' | 'wifi' | 'crypto' | 'custom';
export type EncryptionType = 'none' | 'aes' | 'tripledes' | 'rc4' | 'rabbit';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type RenderAs = 'canvas' | 'svg';
export type CryptoType = 'BTC' | 'ETH' | 'LTC' | 'XRP' | 'DOGE' | 'ADA' | 'DOT';

export interface ImageSettings {
  src: string;
  excavate: boolean;
  width: number;
  height: number;
}

export interface EncryptionConfig {
  type: EncryptionType;
  key: string;
  iv?: string;
  salt?: string;
}

export interface QRCodeProps {
  value: string;
  size: number;
  bgColor: string;
  fgColor: string;
  level: ErrorCorrectionLevel;
  includeMargin: boolean;
  renderAs: RenderAs;
  imageSettings?: ImageSettings;
  version?: number;
  maskPattern?: number;
}

export interface WifiData {
  ssid: string;
  password: string;
  encryption: string;
  isHidden: boolean;
}

export interface ContactData {
  name: string;
  phone: string;
  email: string;
  company: string;
}

export interface CryptoData {
  publicKey: string;
  amount: string;
  currency: CryptoType;
}

export interface QRCodeState {
  text: string;
  size: number;
  qrType: QRCodeType;
  backgroundColor: string;
  foregroundColor: string;
  errorCorrectionLevel: ErrorCorrectionLevel;
  includeMargin: boolean;
  imageSettings: ImageSettings;
  useImage: boolean;
  renderAs: RenderAs;
  contactData: ContactData;
  wifiData: WifiData;
  cryptoData: CryptoData;
  encryptionConfig: EncryptionConfig;
  maskPattern: number;
  version: number;
  finalData: string;
  isProcessing: boolean;
}