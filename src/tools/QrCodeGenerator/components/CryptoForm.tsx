// components/CryptoForm.tsx
import React from 'react';
import { CryptoData, CryptoType } from '../../../types/qrTypes';

interface CryptoFormProps {
  cryptoData: CryptoData;
  setCryptoData: (data: Partial<CryptoData>) => void;
}

const CryptoForm: React.FC<CryptoFormProps> = ({ cryptoData, setCryptoData }) => {
  const { publicKey, amount, currency } = cryptoData;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-blue-700 mb-2">
          Cryptocurrency
        </label>
        <div className="relative">
          <select
            value={currency}
            onChange={(e) => setCryptoData({ currency: e.target.value as CryptoType })}
            className="block appearance-none w-full bg-white border-2 border-blue-300 hover:border-blue-400 px-4 py-2 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="LTC">Litecoin (LTC)</option>
            <option value="XRP">Ripple (XRP)</option>
            <option value="DOGE">Dogecoin (DOGE)</option>
            <option value="ADA">Cardano (ADA)</option>
            <option value="DOT">Polkadot (DOT)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          id="address"
          value={publicKey}
          onChange={(e) => setCryptoData({ publicKey: e.target.value })}
          className="peer h-10 w-full border-b-2 border-blue-300 text-gray-900 placeholder-transparent focus:outline-none focus:border-blue-600"
          placeholder="Wallet Address"
        />
        <label 
          htmlFor="address" 
          className="absolute left-0 -top-3.5 text-sm text-blue-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-blue-600 peer-focus:text-sm"
        >
          Amount (Optional)
        </label>
        <div className="absolute right-0 top-2 text-sm text-gray-500">
          {currency}
        </div>
      </div>

      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
        <div className="flex items-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Cryptocurrency QR Info</span>
        </div>
        <p className="text-xs text-gray-600">
          When scanned, this QR code will prompt the user to send {amount ? amount : "any amount of"} {currency} to your wallet address.
        </p>
      </div>
    </div>
  );
};

export default CryptoForm;