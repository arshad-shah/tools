// components/EncryptionSettings.tsx
import React from 'react';
import { EncryptionConfig, EncryptionType } from '../../../types/qrTypes';
import { Input } from '../../../components/input';

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

  return (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-500 to-indigo-500 flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Data Encryption</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Encryption Method
          </label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setEncryptionConfig({ type: e.target.value as EncryptionType })}
              className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
            >
              <option value="none">None</option>
              <option value="aes">AES-256 (Advanced Encryption Standard)</option>
              <option value="tripledes">Triple DES (Data Encryption Standard)</option>
              <option value="rc4">RC4 (Rivest Cipher 4)</option>
              <option value="rabbit">Rabbit Stream Cipher</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {type !== 'none' && (
          <div className="space-y-4 pt-2 border-t border-gray-200">
            <div>
              <label htmlFor="encryption-key" className="block text-sm font-medium text-gray-700 mb-1">
                Encryption Key
              </label>
              <Input
                type="text"
                id="encryption-key"
                value={key}
                onChange={(e) => setEncryptionConfig({ key: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-fuchsia-500 focus:ring focus:ring-fuchsia-500 focus:ring-opacity-50"
                placeholder="Enter a secret key"
              />
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
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                      placeholder="16 characters"
                    />
                    <button
                      type="button"
                      onClick={generateRandomIV}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    A 16-character string used to enhance encryption security
                  </p>
                </div>

                {type === 'aes' && (
                  <div>
                    <label htmlFor="salt" className="block text-sm font-medium text-gray-700 mb-1">
                      Salt (optional)
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        id="salt"
                        value={salt || ''}
                        onChange={(e) => setEncryptionConfig({ salt: e.target.value })}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                        placeholder="8+ characters"
                      />
                      <button
                        type="button"
                        onClick={generateRandomSalt}
                        className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      >
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

            <div className="rounded-md bg-yellow-50 p-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      The recipient will need the same encryption method and key to decode this QR code. Keep your key secure and share it through a separate channel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EncryptionSettings;