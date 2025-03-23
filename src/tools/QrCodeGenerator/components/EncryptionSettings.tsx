// components/EncryptionSettings.tsx
import React from 'react';
import { EncryptionConfig, EncryptionType } from '../../../types/qrTypes';
import { Input } from '../../../components/input';
import { 
  Shield, 
  Key, 
  RefreshCw, 
  AlertTriangle, 
  Hash, 
  ChevronDown,
  Lock,
  ShieldOff,
  Fingerprint,
  ShieldAlert
} from 'lucide-react';

interface EncryptionSettingsProps {
  encryptionConfig: EncryptionConfig;
  setEncryptionConfig: (config: Partial<EncryptionConfig>) => void;
  generateRandomIV: () => void;
  generateRandomSalt: () => void;
}

const EncryptionSettings: React.FC<EncryptionSettingsProps> = ({
  encryptionConfig,
  setEncryptionConfig,
  generateRandomIV,
  generateRandomSalt
}) => {
  const { type, key, iv, salt } = encryptionConfig;

  const encryptionOptions = [
    { value: 'none', label: 'None', icon: <ShieldOff size={16} /> },
    { value: 'aes', label: 'AES-256 (Advanced Encryption Standard)', icon: <Shield size={16} /> },
    { value: 'tripledes', label: 'Triple DES (Data Encryption Standard)', icon: <Lock size={16} /> },
    { value: 'rc4', label: 'RC4 (Rivest Cipher 4)', icon: <Fingerprint size={16} /> },
    { value: 'rabbit', label: 'Rabbit Stream Cipher', icon: <ShieldAlert size={16} /> }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-emerald-500" />
          <h3 className="text-base font-medium text-gray-800">Encryption Method</h3>
        </div>

        <div className="relative">
          <select
            value={type}
            onChange={(e) => setEncryptionConfig({ type: e.target.value as EncryptionType })}
            className="block appearance-none w-full bg-white border border-gray-300 hover:border-emerald-300 px-4 py-2 pr-8 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            {encryptionOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <ChevronDown size={16} />
          </div>
        </div>

        {type === 'none' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <ShieldOff size={16} className="text-gray-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">
                  Your QR code data will not be encrypted. Anyone who scans this QR code will be able to read its contents.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {type !== 'none' && (
        <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Key size={20} className="text-emerald-500" />
            <h3 className="text-base font-medium text-gray-800">Encryption Keys</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="encryption-key" className="block text-sm font-medium text-gray-700 mb-1">
                Encryption Key
              </label>
              <Input
                type="text"
                id="encryption-key"
                value={key}
                onChange={(e) => setEncryptionConfig({ key: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-500 focus:ring-opacity-50"
                placeholder="Enter a secret key"
              />
              <p className="mt-1 text-xs text-gray-500">
                This key will be needed to decrypt the QR code
              </p>
            </div>

            {(type === 'aes' || type === 'tripledes') && (
              <>
                <div>
                  <label htmlFor="iv" className="block text-sm font-medium text-gray-700 mb-1">
                    Initialization Vector (IV)
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="iv"
                      value={iv || ''}
                      onChange={(e) => setEncryptionConfig({ iv: e.target.value })}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="16 characters"
                    />
                    <button
                      type="button"
                      onClick={generateRandomIV}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <RefreshCw size={16} className="mr-1" />
                      Generate
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    A 16-character string used to enhance encryption security
                  </p>
                </div>

                {type === 'aes' && (
                  <div>
                    <label htmlFor="salt" className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                      <Hash size={14} /> 
                      <span>Salt (optional)</span>
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        id="salt"
                        value={salt || ''}
                        onChange={(e) => setEncryptionConfig({ salt: e.target.value })}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="8+ characters"
                      />
                      <button
                        type="button"
                        onClick={generateRandomSalt}
                        className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <RefreshCw size={16} className="mr-1" />
                        Generate
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Random data that makes the hash more secure
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {type !== 'none' && (
        <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
          <div className="flex items-start p-4 bg-amber-50 rounded-lg border border-amber-100">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-amber-800">Important Note</h4>
              <div className="mt-1 text-sm text-amber-700">
                <p>
                  The recipient will need the same encryption method and key to decode this QR code. Keep your key secure and share it through a separate channel.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {type !== 'none' && (
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex items-start">
            <Shield size={16} className="text-emerald-500 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-emerald-800">Encryption Details</h4>
              <div className="mt-1">
                <ul className="list-disc pl-5 text-xs text-emerald-700 space-y-1">
                  <li>AES-256 offers the strongest security but requires more processing power</li>
                  <li>Triple DES is widely supported but slower than AES</li>
                  <li>RC4 is fast but has known vulnerabilities</li>
                  <li>Rabbit offers good performance and security for most uses</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EncryptionSettings;