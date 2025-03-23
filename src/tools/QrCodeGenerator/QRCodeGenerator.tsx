// components/QRCodeGenerator.tsx
import React, { useState } from 'react';
import QRContentForm from './components/QRContentForm';
import EncryptionSettings from './components/EncryptionSettings';
import AppearanceSettings from './components/AppearanceSettings';
import QRDisplay from './components/QRDisplay';
import { useQRCode } from './hooks/useQrCode';
import { Layers, Palette, Shield, Download, Info } from 'lucide-react';

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

  const tabs = [
    { id: 'content', label: 'Content', icon: <Layers size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
    { id: 'encryption', label: 'Encryption', icon: <Shield size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Side - Controls */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-emerald-100">
              {/* Tabs */}
              <div className="flex border-b border-emerald-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-4 px-4 text-center font-medium transition-all duration-200 flex items-center justify-center ${
                      activeTab === tab.id
                        ? 'text-white bg-emerald-500 shadow-sm'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'content' && (
                  <QRContentForm
                    qrType={state.qrType}
                    setQrType={setQrType}
                    text={state.text}
                    setText={setText}
                    contactData={state.contactData}
                    setContactData={setContactData}
                    wifiData={state.wifiData}
                    setWifiData={setWifiData}
                    cryptoData={state.cryptoData}
                    setCryptoData={setCryptoData}
                  />
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
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100 sticky top-6">
              <h3 className="text-xl font-semibold text-emerald-800 mb-6 text-center">QR Code Preview</h3>
              
              <div className="flex justify-center items-center bg-gray-50 rounded-xl p-6 border border-emerald-50">
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
              </div>
              
              <div className="mt-6">
                <button 
                  onClick={handleDownloadQRCode}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center"
                >
                  <Download size={20} className="mr-2" />
                  Download QR Code
                </button>
              </div>
              
              <div className="mt-6 bg-emerald-50 rounded-lg p-4 text-sm text-emerald-800 border border-emerald-100">
                <div className="flex">
                  <Info size={20} className="text-emerald-500 mr-2 flex-shrink-0" />
                  <div>
                    <p>
                      <strong>Error correction: </strong> 
                      {state.errorCorrectionLevel === 'L' && 'Low (7%)'}
                      {state.errorCorrectionLevel === 'M' && 'Medium (15%)'}
                      {state.errorCorrectionLevel === 'Q' && 'Quartile (25%)'}
                      {state.errorCorrectionLevel === 'H' && 'High (30%)'}
                    </p>
                    {state.encryptionConfig.type !== 'none' && (
                      <p className="mt-1">
                        <strong>Encryption: </strong> 
                        {state.encryptionConfig.type.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Quick Tips Section */}
              <div className="mt-6 p-4 border border-emerald-100 rounded-lg bg-white">
                <h4 className="font-medium text-emerald-800 mb-2">Tips for Better QR Codes</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">•</span>
                    Higher error correction improves scan reliability but makes denser codes
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">•</span>
                    Ensure good contrast between foreground and background colors
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-2">•</span>
                    Test your QR code on multiple devices before distribution
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;