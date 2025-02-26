// components/WifiForm.tsx
import React from 'react';
import { WifiData } from '../../../types/qrTypes';

interface WifiFormProps {
  wifiData: WifiData;
  setWifiData: (data: Partial<WifiData>) => void;
}

const WifiForm: React.FC<WifiFormProps> = ({ wifiData, setWifiData }) => {
  const { ssid, password, encryption, isHidden } = wifiData;

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          id="ssid"
          value={ssid}
          onChange={(e) => setWifiData({ ssid: e.target.value })}
          className="peer h-10 w-full border-b-2 border-teal-300 text-gray-900 placeholder-transparent focus:outline-none focus:border-teal-600"
          placeholder="SSID"
        />
        <label 
          htmlFor="ssid" 
          className="absolute left-0 -top-3.5 text-sm text-teal-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-teal-600 peer-focus:text-sm"
        >
          Network Name (SSID)
        </label>
      </div>

      <div className="relative">
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setWifiData({ password: e.target.value })}
          className="peer h-10 w-full border-b-2 border-teal-300 text-gray-900 placeholder-transparent focus:outline-none focus:border-teal-600"
          placeholder="Password"
        />
        <label 
          htmlFor="password" 
          className="absolute left-0 -top-3.5 text-sm text-teal-600 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-teal-600 peer-focus:text-sm"
        >
          Password
        </label>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-teal-700 mb-2">
          Encryption Type
        </label>
        <div className="relative">
          <select
            value={encryption}
            onChange={(e) => setWifiData({ encryption: e.target.value })}
            className="block appearance-none w-full bg-white border-2 border-teal-300 hover:border-teal-400 px-4 py-2 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">None</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-teal-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="hiddenNetwork"
          type="checkbox"
          checked={isHidden}
          onChange={(e) => setWifiData({ isHidden: e.target.checked })}
          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
        />
        <label htmlFor="hiddenNetwork" className="ml-2 block text-sm text-gray-700">
          Hidden Network
        </label>
      </div>
    </div>
  );
};

export default WifiForm;