// components/WifiForm.tsx
import React, { useState } from 'react';
import { WifiData } from '../../../types/qrTypes';
import { Wifi, Lock, Eye, EyeOff, ChevronDown, KeyRound } from 'lucide-react';

interface WifiFormProps {
  wifiData: WifiData;
  setWifiData: (data: Partial<WifiData>) => void;
}

const WifiForm: React.FC<WifiFormProps> = ({ wifiData, setWifiData }) => {
  const { ssid, password, encryption, isHidden } = wifiData;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-5">
      {/* Network Name (SSID) */}
      <div className="space-y-1">
        <label htmlFor="ssid" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Wifi size={16} className="text-emerald-500" />
          Network Name (SSID)
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type="text"
            id="ssid"
            value={ssid}
            onChange={(e) => setWifiData({ ssid: e.target.value })}
            className="block w-full pr-10 sm:text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 py-2"
            placeholder="Enter network name"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className={`h-2 w-2 rounded-full ${ssid ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <KeyRound size={16} className="text-emerald-500" />
          Password
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            value={password}
            onChange={(e) => setWifiData({ password: e.target.value })}
            className="block w-full pr-10 sm:text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 py-2"
            placeholder="Enter network password"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-emerald-500 focus:outline-none"
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {encryption === "nopass" 
            ? "No password required for this network" 
            : "Password must match your WiFi network password"}
        </p>
      </div>

      {/* Encryption Type */}
      <div className="space-y-1">
        <label htmlFor="encryption" className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Lock size={16} className="text-emerald-500" />
          Encryption Type
        </label>
        <div className="relative mt-1 rounded-md shadow-sm">
          <select
            id="encryption"
            value={encryption}
            onChange={(e) => setWifiData({ encryption: e.target.value })}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md appearance-none"
          >
            <option value="WPA">WPA/WPA2/WPA3</option>
            <option value="WEP">WEP (Legacy)</option>
            <option value="nopass">None (Open Network)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <ChevronDown size={16} />
          </div>
        </div>
        {encryption === "WEP" && (
          <p className="text-xs text-amber-600 mt-1 flex items-start">
            <span className="block mr-1 mt-0.5">⚠️</span>
            <span>WEP encryption is considered insecure and has been deprecated. Using WPA2/WPA3 is recommended.</span>
          </p>
        )}
      </div>

      {/* Hidden Network */}
      <div className="pt-2">
        <div className="flex items-center">
          <input
            id="hiddenNetwork"
            type="checkbox"
            checked={isHidden}
            onChange={(e) => setWifiData({ isHidden: e.target.checked })}
            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
          />
          <label htmlFor="hiddenNetwork" className="ml-2 block text-sm text-gray-700">
            Hidden Network
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Select this if your network doesn't broadcast its name (SSID)
        </p>
      </div>

      {/* Preview */}
      <div className="mt-5 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
        <div className="text-xs font-medium text-emerald-800 mb-1">Network Information Preview:</div>
        <div className="text-sm text-emerald-700">
          <div className="flex items-center gap-1">
            <Wifi size={14} className="text-emerald-600" />
            <span className="font-medium">SSID:</span> {ssid || "(Not set)"}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Lock size={14} className="text-emerald-600" />
            <span className="font-medium">Security:</span> {encryption === "nopass" ? "Open Network" : encryption}
          </div>
          {isHidden && (
            <div className="mt-1 text-amber-600 text-xs">
              This network is hidden and may require manual setup on some devices.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WifiForm;