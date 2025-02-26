// components/QRDisplay.tsx
import React from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { QRCodeProps } from '../../../types/qrTypes';

interface QRDisplayProps extends QRCodeProps {
  isProcessing: boolean;
  qrRef: React.RefObject<HTMLDivElement | null>;
  handleDownload: () => void;
}

const QRDisplay: React.FC<QRDisplayProps> = ({
  value,
  size,
  bgColor,
  fgColor,
  level,
  includeMargin,
  renderAs,
  imageSettings,
  version,
  isProcessing,
  qrRef,
  handleDownload
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div 
          ref={qrRef}
          className="bg-white p-6 rounded-2xl shadow-lg border-4 border-gray-100 relative"
          style={{ maxWidth: `${size + 48}px` }}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
              <p className="mt-4 text-gray-600 text-sm">Processing...</p>
            </div>
          ) : (
            <>
              {renderAs === 'svg' ? (
                <QRCodeSVG
                  value={value || ' '} // Provide at least a space to avoid empty string errors
                  size={size}
                  bgColor={bgColor}
                  fgColor={fgColor}
                  level={level}
                  includeMargin={includeMargin}
                  imageSettings={imageSettings && imageSettings.src ? imageSettings : undefined}
                  minVersion={version !== undefined && version > 0 ? version : 1}
                />
              ) : (
                <QRCodeCanvas
                  value={value || ' '} // Provide at least a space to avoid empty string errors
                  size={size}
                  bgColor={bgColor}
                  fgColor={fgColor}
                  level={level}
                  includeMargin={includeMargin}
                  imageSettings={imageSettings && imageSettings.src ? imageSettings : undefined}
                  minVersion={version !== undefined && version > 0 ? version : 1}
                />
              )}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-md border-2 border-gray-100"></div>
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-white rounded-full shadow-md border-2 border-gray-100"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-md border-2 border-gray-100"></div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-white rounded-full shadow-md border-2 border-gray-100"></div>
            </>
          )}
        </div>
        
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-4 py-1 rounded-full shadow-md border border-gray-200 text-xs font-medium text-gray-500 whitespace-nowrap">
          {renderAs === 'svg' ? 'SVG Format' : 'Canvas Format'}
        </div>
      </div>

      <div className="mt-10 w-full">
        <button
          onClick={handleDownload}
          disabled={isProcessing}
          className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white ${
            isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Download QR Code {renderAs === 'svg' ? '(SVG)' : '(PNG)'}
        </button>
      </div>
    </div>
  );
};

export default QRDisplay;