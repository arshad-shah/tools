// components/QRDisplay.tsx
import React from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { QRCodeProps } from '../../../types/qrTypes';
import { Loader } from 'lucide-react';

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
  qrRef
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div 
          ref={qrRef}
          className="bg-white p-6 rounded-xl shadow-md border-4 border-emerald-50 relative"
          style={{ maxWidth: `${size + 48}px` }}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
              <div className="animate-spin text-emerald-500">
                <Loader size={40} />
              </div>
              <p className="mt-4 text-emerald-700 text-sm font-medium">Processing...</p>
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
              
              {/* Corner decorations */}
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full shadow-sm"></div>
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-emerald-500 rounded-full shadow-sm"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full shadow-sm"></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-emerald-500 rounded-full shadow-sm"></div>
            </>
          )}
        </div>
        
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-emerald-100 px-4 py-1 rounded-full shadow-sm border border-emerald-200 text-xs font-medium text-emerald-800 whitespace-nowrap">
          {renderAs === 'svg' ? 'SVG Format' : 'PNG Format'}
        </div>
      </div>
      
      {!isProcessing && value && value.trim() !== '' && (
        <div className="mt-6 bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700 border border-emerald-100 w-full max-w-xs text-center">
          <p className="font-medium">QR code is ready to scan</p>
          <p className="mt-1 text-emerald-600">Contains {value.length} characters</p>
        </div>
      )}
    </div>
  );
};

export default QRDisplay;