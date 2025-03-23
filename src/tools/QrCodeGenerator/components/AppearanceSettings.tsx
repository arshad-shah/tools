// components/AppearanceSettings.tsx
import React from 'react';
import { ErrorCorrectionLevel, ImageSettings, RenderAs } from '../../../types/qrTypes';
import { 
  Sliders, 
  Palette, 
  FileImage, 
  ChevronDown, 
  Settings, 
  Image, 
  FileType2, 
  Grid,
  CheckSquare
} from 'lucide-react';

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
    { bg: '#FFFFFF', fg: '#10B981', name: 'Emerald' },
    { bg: '#F0FDF4', fg: '#047857', name: 'Green' },
    { bg: '#ECFDF5', fg: '#0D9488', name: 'Teal' },
    { bg: '#FFFFFF', fg: '#0369A1', name: 'Blue' },
  ];

  return (
    <div className="space-y-6">
      {/* Size Slider */}
      <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sliders size={18} className="text-emerald-500" />
          <h3 className="text-base font-medium text-gray-800">QR Code Size</h3>
        </div>
        
        <label htmlFor="size-slider" className="flex justify-between text-sm font-medium text-gray-700 mb-2">
          <span>Size</span>
          <span className="text-emerald-600 font-semibold">{size}x{size}px</span>
        </label>
        <input
          type="range"
          id="size-slider"
          min="100"
          max="500"
          step="20"
          value={size}
          onChange={(e) => setSize(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Small</span>
          <span>Medium</span>
          <span>Large</span>
        </div>
      </div>

      {/* Color Settings */}
      <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Palette size={18} className="text-emerald-500" />
          <h3 className="text-base font-medium text-gray-800">Color Settings</h3>
        </div>
        
        {/* Color Presets */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color Presets
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {colorPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => {
                  setBackgroundColor(preset.bg);
                  setForegroundColor(preset.fg);
                }}
                className="relative w-full aspect-square rounded-lg overflow-hidden border-2 hover:scale-105 transition-transform"
                style={{ borderColor: preset.bg === backgroundColor && preset.fg === foregroundColor ? '#10B981' : 'transparent' }}
              >
                <div className="absolute inset-0" style={{ backgroundColor: preset.bg }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1/2 h-1/2 rounded" style={{ backgroundColor: preset.fg }}></div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-black bg-opacity-60 text-white text-xs text-center py-1">
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
                className="flex-1 min-w-0 block rounded-none rounded-r-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
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
                className="flex-1 min-w-0 block rounded-none rounded-r-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Correction */}
      <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileType2 size={18} className="text-emerald-500" />
          <h3 className="text-base font-medium text-gray-800">Error Correction</h3>
        </div>
        
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Error Correction Level
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['L', 'M', 'Q', 'H'] as ErrorCorrectionLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setErrorCorrectionLevel(level)}
              className={`py-2 px-3 border-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                errorCorrectionLevel === level
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
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
        <p className="mt-2 text-xs text-gray-500">
          Higher levels make the QR code more resistant to damage but increase density
        </p>
      </div>

      {/* Format Options */}
      <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Grid size={18} className="text-emerald-500" />
          <h3 className="text-base font-medium text-gray-800">Format Options</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Format
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setRenderAs('canvas')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md border focus:outline-none ${
                  renderAs === 'canvas'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
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
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
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
                  className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                    includeMargin ? 'bg-emerald-600' : 'bg-gray-200'
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
      </div>

      {/* Logo/Image */}
      <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Image size={18} className="text-emerald-500" />
          <h3 className="text-base font-medium text-gray-800">Logo/Image</h3>
        </div>
        
        <div className="flex items-center justify-between">
          <label htmlFor="image-toggle" className="block text-sm font-medium text-gray-700">
            Include Logo/Image
          </label>
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setUseImage(!useImage)}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                useImage ? 'bg-emerald-600' : 'bg-gray-200'
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
          <div className="mt-3 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Logo Source
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Logo URL Input */}
                <div className="flex-1">
                  <label htmlFor="logo-url" className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL
                  </label>
                  <input
                    type="text"
                    id="logo-url"
                    value={imageSettings.src}
                    onChange={(e) => setImageSettings({...imageSettings, src: e.target.value})}
                    className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                
                {/* Divider with "or" text */}
                <div className="flex items-center justify-center">
                  <div className="text-center px-2 text-gray-500">or</div>
                </div>
                
                {/* File Upload */}
                <div className="flex-1">
                  <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Logo
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-emerald-300 transition-colors">
                    <div className="space-y-1 text-center">
                      <FileImage size={20} className="mx-auto text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500"
                        >
                          <span>Upload a file</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const result = event.target?.result as string;
                                  setImageSettings({...imageSettings, src: result});
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 1MB</p>
                    </div>
                  </div>
                </div>
              </div>
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
                  className="mt-1 p-2 block w-full h-10 text-black border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                  className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="excavate" className="ml-2 block text-sm text-gray-700">
                  Excavate (Clear QR behind logo)
                </label>
              </div>
            </div>
            
            {imageSettings.src && (
              <div className="mt-4 border-t border-emerald-100 pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Logo Preview:</div>
                <div className="flex justify-center bg-white p-3 rounded-lg border border-emerald-100">
                  <img 
                    src={imageSettings.src} 
                    alt="Logo preview" 
                    className="max-h-16 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlLW9mZiI+PHBhdGggZD0iTTAgM2g0Ii8+PHBhdGggZD0iTTAgM3YxOGEyIDIgMCAwIDAgMiAyaDE4YTIgMiAwIDAgMCAyLTJWM2EyIDIgMCAwIDAtMi0ySDJhMiAyIDAgMCAwLTIgMnoiLz48cGF0aCBkPSJNMTQgMTRsMy0zcDkgOSIvPjxwYXRoIGQ9Im03LjUgMTMuNS05IDkiLz48cGF0aCBkPSJNMTQuNSA3LjUgOSAxMyIvPjxwYXRoIGQ9Ik0xNiA4aDAiLz48L3N2Zz4=';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-emerald-500" />
              <span className="text-base font-medium text-gray-800">Advanced Technical Settings</span>
            </div>
            <ChevronDown size={18} className="text-gray-500 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
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
                className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Pattern used to mask the data (-1 to 7, -1 for auto-select)
              </p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default AppearanceSettings;