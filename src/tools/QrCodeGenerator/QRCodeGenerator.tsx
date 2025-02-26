// components/QRCodeGenerator.tsx
import React, { useState } from 'react';
import TextUrlForm from './components/TextUrlForm';
import ContactForm from './components/ContactForm';
import WifiForm from './components/WifiForm';
import CryptoForm from './components/CryptoForm';
import EncryptionSettings from './components/EncryptionSettings';
import AppearanceSettings from './components/AppearanceSettings';
import QRDisplay from './components/QRDisplay';
import { useQRCode } from './hooks/useQrCode';
import { QRCodeType } from '../../types/qrTypes';

const QRCodeGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'content' | 'appearance' | 'encryption'>('content');
  
  const {
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
  } = useQRCode();

  const renderContentForm = () => {
    switch (state.qrType) {
      case 'url':
      case 'text':
        return (
          <TextUrlForm
            text={state.text}
            setText={setText}
            isUrl={state.qrType === 'url'}
          />
        );
      case 'contact':
        return (
          <ContactForm
            contactData={state.contactData}
            setContactData={setContactData}
          />
        );
      case 'wifi':
        return (
          <WifiForm
            wifiData={state.wifiData}
            setWifiData={setWifiData}
          />
        );
      case 'crypto':
        return (
          <CryptoForm
            cryptoData={state.cryptoData}
            setCryptoData={setCryptoData}
          />
        );
      default:
        return (
          <TextUrlForm
            text={state.text}
            setText={setText}
            isUrl={false}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-600">
            QR Code Generator
          </h1>
          <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto">
            Create customized QR codes for URLs, text, contacts, WiFi networks, and cryptocurrencies
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Side - Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white shadow-md rounded-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`flex-1 py-4 px-4 text-center font-medium text-sm ${
                    activeTab === 'content'
                      ? 'text-indigo-600 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={`flex-1 py-4 px-4 text-center font-medium text-sm ${
                    activeTab === 'appearance'
                      ? 'text-indigo-600 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Appearance
                </button>
                <button
                  onClick={() => setActiveTab('encryption')}
                  className={`flex-1 py-4 px-4 text-center font-medium text-sm ${
                    activeTab === 'encryption'
                      ? 'text-indigo-600 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Encryption
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'content' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        QR Code Type
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(
                          [
                            { value: 'url', label: 'URL', icon: '🔗' },
                            { value: 'text', label: 'Text', icon: '📝' },
                            { value: 'contact', label: 'Contact', icon: '👤' },
                            { value: 'wifi', label: 'WiFi', icon: '📶' },
                            { value: 'crypto', label: 'Crypto', icon: '💰' },
                            { value: 'custom', label: 'Custom', icon: '🔧' },
                          ] as { value: QRCodeType; label: string; icon: string }[]
                        ).map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setQrType(type.value)}
                            className={`flex items-center justify-center py-2 px-3 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                              state.qrType === type.value
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="mr-2">{type.icon}</span>
                            <span>{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {renderContentForm()}
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <AppearanceSettings
                    size={state.size}
                    setSize={setSize}
                    backgroundColor={state.backgroundColor}
                    setBackgroundColor={setBackgroundColor}
                    foregroundColor={state.foregroundColor}
                    setForegroundColor={setForegroundColor}
                    errorCorrectionLevel={state.errorCorrectionLevel}
                    setErrorCorrectionLevel={setErrorCorrectionLevel}
                    includeMargin={state.includeMargin}
                    setIncludeMargin={setIncludeMargin}
                    renderAs={state.renderAs}
                    setRenderAs={setRenderAs}
                    useImage={state.useImage}
                    setUseImage={setUseImage}
                    imageSettings={state.imageSettings}
                    setImageSettings={setImageSettings}
                    version={state.version}
                    setVersion={setVersion}
                    maskPattern={state.maskPattern}
                    setMaskPattern={setMaskPattern}
                  />
                )}

                {activeTab === 'encryption' && (
                  <EncryptionSettings
                    encryptionConfig={state.encryptionConfig}
                    setEncryptionConfig={setEncryptionConfig}
                    generateRandomIV={generateRandomIV}
                    generateRandomSalt={generateRandomSalt}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Side - QR Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6 text-center">QR Code Preview</h3>
              
              <QRDisplay
                value={state.finalData}
                size={state.size}
                bgColor={state.backgroundColor}
                fgColor={state.foregroundColor}
                level={state.errorCorrectionLevel}
                includeMargin={state.includeMargin}
                renderAs={state.renderAs}
                imageSettings={state.useImage ? state.imageSettings : undefined}
                version={state.version}
                isProcessing={state.isProcessing}
                qrRef={qrRef}
                handleDownload={handleDownloadQRCode}
              />
              
              <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <div className="flex">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p>
                      <strong>Using error correction: </strong> 
                      {state.errorCorrectionLevel === 'L' && 'Low (7%)'}
                      {state.errorCorrectionLevel === 'M' && 'Medium (15%)'}
                      {state.errorCorrectionLevel === 'Q' && 'Quartile (25%)'}
                      {state.errorCorrectionLevel === 'H' && 'High (30%)'}
                    </p>
                    {state.encryptionConfig.type !== 'none' && (
                      <p className="mt-1">
                        <strong>Data is encrypted using: </strong> 
                        {state.encryptionConfig.type.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;