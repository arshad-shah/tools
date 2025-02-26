// hooks/useQRCode.ts
import { useState, useEffect, useRef } from 'react';
import { 
  QRCodeState, 
  QRCodeType,
  ErrorCorrectionLevel,
  RenderAs,
  ImageSettings,
  EncryptionConfig,
  ContactData,
  WifiData,
  CryptoData
} from '../../../types/qrTypes';
import { 
  generateQRContent, 
  encryptContent, 
  generateRandomString, 
  downloadQRCode 
} from '../utils/qrUtils';

const initialState: QRCodeState = {
  text: 'https://example.com',
  size: 200,
  qrType: 'url',
  backgroundColor: '#FFFFFF',
  foregroundColor: '#000000',
  errorCorrectionLevel: 'M',
  includeMargin: true,
  imageSettings: {
    src: '',
    excavate: true,
    width: 40,
    height: 40,
  },
  useImage: false,
  renderAs: 'canvas',
  contactData: {
    name: '',
    phone: '',
    email: '',
    company: '',
  },
  wifiData: {
    ssid: '',
    password: '',
    encryption: 'WPA',
    isHidden: false,
  },
  cryptoData: {
    publicKey: '',
    amount: '',
    currency: 'BTC',
  },
  encryptionConfig: {
    type: 'none',
    key: '',
    iv: '',
    salt: '',
  },
  maskPattern: -1,
  version: 0,
  finalData: '',
  isProcessing: false,
};

export const useQRCode = () => {
  // State
  const [state, setState] = useState<QRCodeState>(initialState);
  const qrRef = useRef<HTMLDivElement>(null!);
  
  // Update the final data based on the selected type and encryption
  useEffect(() => {
    setState(prevState => ({
      ...prevState,
      isProcessing: true
    }));
    
    // Generate content based on QR type
    const content = generateQRContent(
      state.qrType,
      state.text,
      state.contactData,
      state.wifiData,
      state.cryptoData
    );
    
    // Apply encryption if enabled
    const finalData = encryptContent(content, state.encryptionConfig);
    
    setState(prevState => ({
      ...prevState,
      finalData,
      isProcessing: false
    }));
  }, [
    state.text, 
    state.qrType, 
    state.contactData, 
    state.wifiData, 
    state.cryptoData, 
    state.encryptionConfig
  ]);
  
  // Function to update text
  const setText = (text: string) => {
    setState(prevState => ({
      ...prevState,
      text
    }));
  };
  
  // Function to update size
  const setSize = (size: number) => {
    setState(prevState => ({
      ...prevState,
      size
    }));
  };
  
  // Function to update QR type
  const setQrType = (qrType: QRCodeType) => {
    setState(prevState => ({
      ...prevState,
      qrType
    }));
  };
  
  // Function to update background color
  const setBackgroundColor = (backgroundColor: string) => {
    setState(prevState => ({
      ...prevState,
      backgroundColor
    }));
  };
  
  // Function to update foreground color
  const setForegroundColor = (foregroundColor: string) => {
    setState(prevState => ({
      ...prevState,
      foregroundColor
    }));
  };
  
  // Function to update error correction level
  const setErrorCorrectionLevel = (errorCorrectionLevel: ErrorCorrectionLevel) => {
    setState(prevState => ({
      ...prevState,
      errorCorrectionLevel
    }));
  };
  
  // Function to update include margin
  const setIncludeMargin = (includeMargin: boolean) => {
    setState(prevState => ({
      ...prevState,
      includeMargin
    }));
  };
  
  // Function to update render as
  const setRenderAs = (renderAs: RenderAs) => {
    setState(prevState => ({
      ...prevState,
      renderAs
    }));
  };
  
  // Function to update use image
  const setUseImage = (useImage: boolean) => {
    setState(prevState => ({
      ...prevState,
      useImage
    }));
  };
  
  // Function to update image settings
  const setImageSettings = (imageSettings: ImageSettings) => {
    setState(prevState => ({
      ...prevState,
      imageSettings
    }));
  };
  
  // Function to update contact data
  const setContactData = (contactData: Partial<ContactData>) => {
    setState(prevState => ({
      ...prevState,
      contactData: {
        ...prevState.contactData,
        ...contactData
      }
    }));
  };
  
  // Function to update wifi data
  const setWifiData = (wifiData: Partial<WifiData>) => {
    setState(prevState => ({
      ...prevState,
      wifiData: {
        ...prevState.wifiData,
        ...wifiData
      }
    }));
  };
  
  // Function to update crypto data
  const setCryptoData = (cryptoData: Partial<CryptoData>) => {
    setState(prevState => ({
      ...prevState,
      cryptoData: {
        ...prevState.cryptoData,
        ...cryptoData
      }
    }));
  };
  
  // Function to update encryption config
  const setEncryptionConfig = (encryptionConfig: Partial<EncryptionConfig>) => {
    setState(prevState => ({
      ...prevState,
      encryptionConfig: {
        ...prevState.encryptionConfig,
        ...encryptionConfig
      }
    }));
  };
  
  // Function to update mask pattern
  const setMaskPattern = (maskPattern: number) => {
    setState(prevState => ({
      ...prevState,
      maskPattern
    }));
  };
  
  // Function to update version
  const setVersion = (version: number) => {
    setState(prevState => ({
      ...prevState,
      version
    }));
  };
  
  // Function to generate random IV
  const generateRandomIV = () => {
    setEncryptionConfig({
      iv: generateRandomString(16)
    });
  };
  
  // Function to generate random salt
  const generateRandomSalt = () => {
    setEncryptionConfig({
      salt: generateRandomString(8)
    });
  };
  
  // Function to download QR code
  const handleDownloadQRCode = () => {
    downloadQRCode(qrRef, state.qrType, state.renderAs);
  };
  
  return {
    state,
    qrRef,
    setText,
    setSize,
    setQrType,
    setBackgroundColor,
    setForegroundColor,
    setErrorCorrectionLevel,
    setIncludeMargin,
    setRenderAs,
    setUseImage,
    setImageSettings,
    setContactData,
    setWifiData,
    setCryptoData,
    setEncryptionConfig,
    setMaskPattern,
    setVersion,
    generateRandomIV,
    generateRandomSalt,
    handleDownloadQRCode,
  };
};