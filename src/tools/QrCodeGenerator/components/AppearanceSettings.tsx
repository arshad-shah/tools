// components/AppearanceSettings.tsx
import React from 'react';
import { ErrorCorrectionLevel, ImageSettings, RenderAs } from '../../../types/qrTypes';

interface AppearanceSettingsProps {
  size: number;
  setSize: (size: number) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  foregroundColor: string;
  setForegroundColor: (color: string) => void;
  errorCorrectionLevel: ErrorCorrectionLevel;
  setErrorCorrectionLevel: (level: ErrorCorrectionLevel) => void;
  includeMargin: boolean;
  setIncludeMargin: (includeMargin: boolean) => void;
  renderAs: RenderAs;
  setRenderAs: (renderAs: RenderAs) => void;
  useImage: boolean;
  setUseImage: (useImage: boolean) => void;
  imageSettings: ImageSettings;
  setImageSettings: (settings: ImageSettings) => void;
  version: number;
  setVersion: (version: number) => void;
  maskPattern: number;
  setMaskPattern: (pattern: number) => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  size,
  setSize,
  backgroundColor,
  setBackgroundColor,
  foregroundColor,
  setForegroundColor,
  errorCorrectionLevel,
  setErrorCorrectionLevel,
  includeMargin,
  setIncludeMargin,
  renderAs,
  setRenderAs,
  useImage,
  setUseImage,
  imageSettings,
  setImageSettings,
  version,
  setVersion,
  maskPattern,
  setMaskPattern
}) => {
  const colorPresets = [
    { bg: '#FFFFFF', fg: '#000000', name: 'Classic' },
    { bg: '#0F172A', fg: '#FFFFFF', name: 'Dark' },
    { bg: '#FFFFFF', fg: '#2563EB', name: 'Blue' },
    { bg: '#F0FDF4', fg: '#16A34A', name: 'Green' },
    { bg: '#FFFFFF', fg: '#7C3AED', name: 'Purple' },
    { bg: '#FEF2F2', fg: '#DC2626', name: 'Red' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 py-4 px-6">
        <h3 className="text-lg font-bold text-white">Appearance Settings</h3>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Size Slider */}
        <div>
          <label htmlFor="size-slider" className="block text-sm font-medium text-gray-700 mb-1">
            QR Code Size: {size}x{size}px
          </label>
          <input
            type="range"
            id="size-slider"
            min="100"
            max="500"
            step="20"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Small</span>
            <span>Medium</span>
            <span>Large</span>
          </div>
        </div>

        {/* Color Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color Presets
          </label>
          <div className="flex flex-wrap gap-3">
            {colorPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => {
                  setBackgroundColor(preset.bg);
                  setForegroundColor(preset.fg);
                }}
                className="relative w-16 h-16 rounded-lg overflow-hidden border-2 hover:scale-105 transition-transform"
                style={{ borderColor: preset.bg === backgroundColor && preset.fg === foregroundColor ? '#9333ea' : 'transparent' }}
              >
                <div className="absolute inset-0" style={{ backgroundColor: preset.bg }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: preset.fg }}></div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-black bg-opacity-50 text-white text-[10px] text-center py-1">
                  {preset.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Background Color
            </label>
            <div className="flex mt-1 rounded-md shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 rounded-l-md border border-r-0 border-gray-300">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-6 h-6 border-0 p-0"
                />
              </div>
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1 min-w-0 block rounded-none rounded-r-md border-gray-300 focus:border-fuchsia-500 focus:ring-fuchsia-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foreground Color
            </label>
            <div className="flex mt-1 rounded-md shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 rounded-l-md border border-r-0 border-gray-300">
                <input
                  type="color"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="w-6 h-6 border-0 p-0"
                />
              </div>
              <input
                type="text"
                value={foregroundColor}
                onChange={(e) => setForegroundColor(e.target.value)}
                className="flex-1 min-w-0 block rounded-none rounded-r-md border-gray-300 focus:border-fuchsia-500 focus:ring-fuchsia-500"
              />
            </div>
          </div>
        </div>

        {/* Error Correction Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Error Correction Level
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['L', 'M', 'Q', 'H'] as ErrorCorrectionLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setErrorCorrectionLevel(level)}
                className={`py-2 px-3 border-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 ${
                  errorCorrectionLevel === level
                    ? 'bg-fuchsia-50 border-fuchsia-500 text-fuchsia-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {level}
                <div className="text-xs text-gray-500">
                  {level === 'L' && '7%'}
                  {level === 'M' && '15%'}
                  {level === 'Q' && '25%'}
                  {level === 'H' && '30%'}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Higher levels make the QR code more resistant to damage but increase density
          </p>
        </div>

        {/* Format Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Format
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setRenderAs('canvas')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md border focus:outline-none ${
                  renderAs === 'canvas'
                    ? 'bg-fuchsia-50 border-fuchsia-500 text-fuchsia-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() => setRenderAs('svg')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md border border-l-0 focus:outline-none ${
                  renderAs === 'svg'
                    ? 'bg-fuchsia-50 border-fuchsia-500 text-fuchsia-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                SVG
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              SVG is scalable, PNG is more compatible
            </p>
          </div>
          
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="margin-toggle" className="block text-sm font-medium text-gray-700">
                Include Margin
              </label>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setIncludeMargin(!includeMargin)}
                  className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 ${
                    includeMargin ? 'bg-fuchsia-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Include margin</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                      includeMargin ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Adds white space around the QR code
            </p>
          </div>
        </div>

        {/* Logo/Image */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="image-toggle" className="block text-sm font-medium text-gray-700">
              Include Logo/Image
            </label>
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setUseImage(!useImage)}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 ${
                  useImage ? 'bg-fuchsia-600' : 'bg-gray-200'
                }`}
              >
                <span className="sr-only">Include logo</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    useImage ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          
          {useImage && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="mb-3">
                <label htmlFor="logo-url" className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="text"
                  id="logo-url"
                  value={imageSettings.src}
                  onChange={(e) => setImageSettings({...imageSettings, src: e.target.value})}
                  className="mt-1 block w-full h-12 border-gray-300 rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500 sm:text-sm"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="logo-width" className="block text-sm font-medium text-gray-700 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    id="logo-width"
                    min="10"
                    max={size / 2}
                    value={imageSettings.width}
                    onChange={(e) => setImageSettings({...imageSettings, width: parseInt(e.target.value)})}
                    className="mt-1 p-2 block w-full h-12 text-black border-gray-300 rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="logo-height" className="block text-sm font-medium text-gray-700 mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    id="logo-height"
                    min="10"
                    max={size / 2}
                    value={imageSettings.height}
                    onChange={(e) => setImageSettings({...imageSettings, height: parseInt(e.target.value)})}
                    className="mt-1 block w-full h-12 border-gray-300 rounded-md shadow-sm focus:ring-fuchsia-500 focus:border-fuchsia-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="mt-3">
                <div className="flex items-center">
                  <input
                    id="excavate"
                    type="checkbox"
                    checked={imageSettings.excavate}
                    onChange={(e) => setImageSettings({...imageSettings, excavate: e.target.checked})}
                    className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300 rounded"
                  />
                  <label htmlFor="excavate" className="ml-2 block text-sm text-gray-700">
                    Excavate (Clear QR behind logo)
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="border-t border-gray-200 pt-4">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">Advanced Technical Settings</span>
              <span className="ml-2 flex-shrink-0">
                <svg className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                  QR Version (0 for auto)
                </label>
                <input
                  type="number"
                  id="version"
                  min="0"
                  max="40"
                  value={version}
                  onChange={(e) => setVersion(parseInt(e.target.value))}
                  className="mt-1 block w-full h-12 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Controls the size of the QR code matrix (1-40, higher = more data)
                </p>
              </div>
              
              <div>
                <label htmlFor="mask-pattern" className="block text-sm font-medium text-gray-700 mb-1">
                  Mask Pattern (-1 for auto)
                </label>
                <input
                  type="number"
                  id="mask-pattern"
                  min="-1"
                  max="7"
                  value={maskPattern}
                  onChange={(e) => setMaskPattern(parseInt(e.target.value))}
                  className="mt-1 block w-full h-12 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Pattern used to mask the data (-1 to 7, -1 for auto-select)
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;