// utils/qrUtils.ts
import { 
  EncryptionConfig, 
  QRCodeType, 
  WifiData, 
  ContactData, 
  CryptoData 
} from '../../../types/qrTypes';
import CryptoJS from 'crypto-js';

/**
 * Generates content for QR code based on the selected type
 */
export const generateQRContent = (
  qrType: QRCodeType,
  text: string,
  contactData: ContactData,
  wifiData: WifiData,
  cryptoData: CryptoData
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
 * Applies selected encryption to the content
 */
export const encryptContent = (content: string, encryptionConfig: EncryptionConfig): string => {
  try {
    switch (encryptionConfig.type) {
      case 'none':
        return content;
      case 'aes':
        if (!encryptionConfig.key) return content;
        
        return CryptoJS.AES.encrypt(
          content,
          encryptionConfig.key,
          {
            iv: encryptionConfig.iv ? CryptoJS.enc.Utf8.parse(encryptionConfig.iv) : undefined,
            salt: encryptionConfig.salt ? encryptionConfig.salt : undefined,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          }
        ).toString();
      case 'tripledes':
        if (!encryptionConfig.key) return content;
        
        return CryptoJS.TripleDES.encrypt(
          content,
          encryptionConfig.key,
          {
            iv: encryptionConfig.iv ? CryptoJS.enc.Utf8.parse(encryptionConfig.iv) : undefined,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          }
        ).toString();
      case 'rc4':
        if (!encryptionConfig.key) return content;
        
        return CryptoJS.RC4.encrypt(
          content,
          encryptionConfig.key
        ).toString();
      case 'rabbit':
        if (!encryptionConfig.key) return content;
        
        return CryptoJS.Rabbit.encrypt(
          content,
          encryptionConfig.key
        ).toString();
      default:
        return content;
    }
  } catch (error) {
    console.error('Encryption error:', error);
    return content; // Fallback to unencrypted content
  }
};

/**
 * Generates a cryptographically secure random string of specified length
 * with no modulo bias
 */
export const generateRandomString = (length: number = 16): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
/**
 * Downloads QR code as an image file
 */
export const downloadQRCode = (qrRef: React.RefObject<HTMLDivElement>, qrType: QRCodeType, renderAs: 'canvas' | 'svg'): void => {
  if (!qrRef.current) return;
  
  let dataUrl;
  if (renderAs === 'canvas') {
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    dataUrl = canvas.toDataURL('image/png');
  } else {
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    dataUrl = URL.createObjectURL(svgBlob);
  }
  
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `qrcode-${qrType}-${new Date().getTime()}.${renderAs === 'canvas' ? 'png' : 'svg'}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  if (renderAs === 'svg') {
    URL.revokeObjectURL(dataUrl);
  }
};