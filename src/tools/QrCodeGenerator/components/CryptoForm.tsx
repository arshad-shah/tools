// components/CryptoForm.tsx
import React from 'react';
import { CryptoData, CryptoType } from '../../../types/qrTypes';
import { 
  Wallet, 
  ChevronDown, 
  Bitcoin, 
  DollarSign, 
  Info, 
  CopyCheck,
  Check
} from 'lucide-react';

interface CryptoFormProps {
  cryptoData: CryptoData;
  setCryptoData: (data: Partial<CryptoData>) => void;
}

const CryptoForm: React.FC<CryptoFormProps> = ({ cryptoData, setCryptoData }) => {
  const { publicKey, amount, currency } = cryptoData;

  // Get currency symbol
  const getCurrencyIcon = (currencyType: CryptoType) => {
    switch (currencyType) {
      case 'BTC':
        return '₿';
      case 'ETH':
        return 'Ξ';
      case 'LTC':
        return 'Ł';
      case 'XRP':
        return 'XRP';
      case 'DOGE':
        return 'Ð';
      case 'ADA':
        return '₳';
      case 'DOT':
        return '●';
      default:
        return currencyType;
    }
  };

  return (
    <div className="space-y-5">
      {/* Cryptocurrency Selection */}
      <div className="space-y-1">
        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Bitcoin size={16} className="text-emerald-500" />
          Cryptocurrency
        </label>
        <div className="relative mt-1 rounded-md shadow-sm">
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCryptoData({ currency: e.target.value as CryptoType })}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md appearance-none"
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="LTC">Litecoin (LTC)</option>
            <option value="XRP">Ripple (XRP)</option>
            <option value="DOGE">Dogecoin (DOGE)</option>
            <option value="ADA">Cardano (ADA)</option>
            <option value="DOT">Polkadot (DOT)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="space-y-1">
        <label htmlFor="publicKey" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Wallet size={16} className="text-emerald-500" />
          Wallet Address
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type="text"
            id="publicKey"
            value={publicKey}
            onChange={(e) => setCryptoData({ publicKey: e.target.value })}
            className="block w-full px-3 py-2 border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            placeholder={`Enter your ${currency} wallet address`}
          />
          {publicKey && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Check size={16} className="text-emerald-500" />
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Double-check your address to ensure funds are sent to the correct wallet
        </p>
      </div>

      {/* Amount (Optional) */}
      <div className="space-y-1">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <DollarSign size={16} className="text-emerald-500" />
          Amount (Optional)
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type="text"
            id="amount"
            value={amount}
            onChange={(e) => setCryptoData({ amount: e.target.value })}
            className="block w-full pl-3 pr-12 py-2 border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            placeholder="0.00"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">{getCurrencyIcon(currency)}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          If left empty, the user can choose how much to send
        </p>
      </div>

      {/* QR Info Section */}
      <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
        <div className="flex items-start">
          <Info size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="ml-3">
            <span className="text-sm font-medium text-emerald-800">Cryptocurrency QR Info</span>
            <p className="mt-1 text-xs text-emerald-700">
              When scanned, this QR code will prompt the user to send {amount ? amount : "any amount of"} {currency} to your wallet address.
            </p>
          </div>
        </div>
      </div>

      {/* Address Preview */}
      {publicKey && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Address Preview</span>
            <CopyCheck size={14} className="text-emerald-500" />
          </div>
          <div className="text-xs font-mono bg-white p-2 rounded border border-gray-200 break-all text-gray-800">
            {publicKey.length > 40 
              ? publicKey.substring(0, 20) + "..." + publicKey.substring(publicKey.length - 20) 
              : publicKey}
          </div>
        </div>
      )}
    </div>
  );
};

export default CryptoForm;