// components/QRContentForm.tsx
import React from 'react';
import { QRCodeType } from '../../../types/qrTypes';
import TextUrlForm from './TextUrlForm';
import ContactForm from './ContactForm';
import WifiForm from './WifiForm';
import CryptoForm from './CryptoForm';
import { 
  Link, 
  FileText, 
  User, 
  Wifi, 
  Coins, 
  Settings
} from 'lucide-react';

interface QRContentFormProps {
  qrType: QRCodeType;
  setQrType: (type: QRCodeType) => void;
  text: string;
  setText: (text: string) => void;
  contactData: any;
  setContactData: (data: any) => void;
  wifiData: any;
  setWifiData: (data: any) => void;
  cryptoData: any;
  setCryptoData: (data: any) => void;
}

const QRContentForm: React.FC<QRContentFormProps> = ({
  qrType,
  setQrType,
  text,
  setText,
  contactData,
  setContactData,
  wifiData,
  setWifiData,
  cryptoData,
  setCryptoData
}) => {
  const qrTypes = [
    { value: 'url', label: 'URL', icon: <Link size={20} /> },
    { value: 'text', label: 'Text', icon: <FileText size={20} /> },
    { value: 'contact', label: 'Contact', icon: <User size={20} /> },
    { value: 'wifi', label: 'WiFi', icon: <Wifi size={20} /> },
    { value: 'crypto', label: 'Crypto', icon: <Coins size={20} /> },
    { value: 'custom', label: 'Custom', icon: <Settings size={20} /> },
  ] as { value: QRCodeType; label: string; icon: React.ReactNode }[];

  const renderForm = () => {
    switch (qrType) {
      case 'url':
      case 'text':
        return (
          <TextUrlForm
            text={text}
            setText={setText}
            isUrl={qrType === 'url'}
          />
        );
      case 'contact':
        return (
          <ContactForm
            contactData={contactData}
            setContactData={setContactData}
          />
        );
      case 'wifi':
        return (
          <WifiForm
            wifiData={wifiData}
            setWifiData={setWifiData}
          />
        );
      case 'crypto':
        return (
          <CryptoForm
            cryptoData={cryptoData}
            setCryptoData={setCryptoData}
          />
        );
      default:
        return (
          <TextUrlForm
            text={text}
            setText={setText}
            isUrl={false}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          QR Code Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {qrTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setQrType(type.value)}
              className={`flex items-center justify-center py-3 px-4 border rounded-lg transition-all duration-200 ${
                qrType === type.value
                  ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                  : 'border-gray-300 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300'
              }`}
            >
              <span className="mr-2 text-lg">{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100">
        {renderForm()}
      </div>
    </div>
  );
};

export default QRContentForm;