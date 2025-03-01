import React, { useState, useRef, ChangeEvent } from 'react';
import { Upload, ImageIcon, Save, Settings, ArrowRight } from 'lucide-react';

interface ImageMetadata {
  filename: string;
  fileType: string;
  lastModified: string;
  aspectRatio: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const ImageConverter: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [compressionLevel, setCompressionLevel] = useState<number>(80);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<string | null>(null);
  const [newSize, setNewSize] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
    setOriginalSize(formatFileSize(file.size));
    setProcessedImage(null);
    setNewSize(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setDimensions({
          width: img.width,
          height: img.height
        });
        setPreview(event.target?.result as string);
        
        // Extract basic metadata
        const metadata: ImageMetadata = {
          filename: file.name,
          fileType: file.type,
          lastModified: new Date(file.lastModified).toLocaleString(),
          aspectRatio: calculateAspectRatio(img.width, img.height)
        };
        setImageMetadata(metadata);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };
  
  const calculateAspectRatio = (width: number, height: number): string => {
    if (!width || !height) return 'Unknown';
    
    const gcd = (a: number, b: number): number => {
      return b === 0 ? a : gcd(b, a % b);
    };
    
    const divisor = gcd(width, height);
    return `${width/divisor}:${height/divisor}`;
  };

  const processImage = (): void => {
    if (!selectedFile || !preview) return;
    
    setIsProcessing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setErrorMessage('Canvas reference is not available');
        setIsProcessing(false);
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        setErrorMessage('Unable to get canvas context');
        setIsProcessing(false);
        return;
      }
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0);
      
      // Get the processed image as Data URL
      try {
        // Only use quality parameter for JPEG and WebP (not for PNG which is lossless)
        const quality = compressionLevel / 100;
        let processedDataUrl: string;
        
        if (outputFormat === 'png') {
          processedDataUrl = canvas.toDataURL('image/png');
        } else {
          processedDataUrl = canvas.toDataURL(`image/${outputFormat}`, quality);
        }
        
        // More accurate file size calculation
        const base64Data = processedDataUrl.split(',')[1];
        if (!base64Data) {
          throw new Error('Failed to extract base64 data');
        }
        
        const byteCharacters = atob(base64Data);
        const byteArrays: Uint8Array[] = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
          const slice = byteCharacters.slice(offset, offset + 1024);
          
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        const blob = new Blob(byteArrays, {type: `image/${outputFormat}`});
        const binarySize = blob.size;
        
        // Check if the compressed size is actually smaller
        if (binarySize >= selectedFile.size && outputFormat !== 'png') {
          // If compression made it larger, try with a higher compression level
          const higherQuality = Math.max(0.6, quality - 0.2);
          processedDataUrl = canvas.toDataURL(`image/${outputFormat}`, higherQuality);
          
          // Recalculate size
          const newBase64Data = processedDataUrl.split(',')[1];
          if (!newBase64Data) {
            throw new Error('Failed to extract base64 data from processed image');
          }
          
          const newByteCharacters = atob(newBase64Data);
          const newByteArrays: Uint8Array[] = [];
          
          for (let offset = 0; offset < newByteCharacters.length; offset += 1024) {
            const slice = newByteCharacters.slice(offset, offset + 1024);
            
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            newByteArrays.push(byteArray);
          }
          
          const newBlob = new Blob(newByteArrays, {type: `image/${outputFormat}`});
          const newBinarySize = newBlob.size;
          
          if (newBinarySize < selectedFile.size) {
            // Use the new compression if it's better
            setProcessedImage(processedDataUrl);
            setNewSize(formatFileSize(newBinarySize));
          } else {
            // If still not better, fall back to PNG for lossless
            const pngDataUrl = canvas.toDataURL('image/png');
            setProcessedImage(pngDataUrl);
            setOutputFormat('png');
            
            // Calculate PNG size
            const pngBase64 = pngDataUrl.split(',')[1];
            if (!pngBase64) {
              throw new Error('Failed to extract base64 data from PNG image');
            }
            
            // Create blob for proper size calculation
            const pngByteCharacters = atob(pngBase64);
            const pngByteArrays: Uint8Array[] = [];
            
            for (let offset = 0; offset < pngByteCharacters.length; offset += 1024) {
              const slice = pngByteCharacters.slice(offset, offset + 1024);
              
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              
              const byteArray = new Uint8Array(byteNumbers);
              pngByteArrays.push(byteArray);
            }
            
            const pngBlob = new Blob(pngByteArrays, {type: 'image/png'});
            setNewSize(formatFileSize(pngBlob.size));
          }
        } else {
          // Use the original compression result
          setProcessedImage(processedDataUrl);
          setNewSize(formatFileSize(binarySize));
        }
        
        setIsProcessing(false);
      } catch (error) {
        setErrorMessage(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsProcessing(false);
      }
    };
    img.onerror = () => {
      setErrorMessage('Failed to load the image');
      setIsProcessing(false);
    };
    img.src = preview;
  };

  const downloadImage = (): void => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `converted-image.${outputFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateReduction = (): string => {
    if (!originalSize || !newSize) return 'N/A';
    
    // Extract numeric part and unit
    const getNumericAndUnit = (sizeString: string): { value: number; unit: string } => {
      const match = sizeString.match(/^([\d.]+)\s*(\w+)$/);
      if (!match) return { value: parseFloat(sizeString), unit: 'bytes' };
      return { value: parseFloat(match[1]), unit: match[2].toLowerCase() };
    };
    
    // Convert to bytes
    const convertToBytes = (size: string): number => {
      const { value, unit } = getNumericAndUnit(size);
      
      if (unit === 'mb' || unit === 'mib') {
        return value * 1048576;
      } else if (unit === 'kb' || unit === 'kib') {
        return value * 1024;
      } else {
        return value;
      }
    };
    
    const originalBytes = convertToBytes(originalSize);
    const newBytes = convertToBytes(newSize);
    
    if (originalBytes <= 0) return 'N/A';
    
    const reduction = ((originalBytes - newBytes) / originalBytes * 100);
    
    if (reduction <= 0) return 'No reduction';
    return `${reduction.toFixed(1)}%`;
  };

  return (
    <div className="bg-gradient-to-br from-fuchsia-50 to-purple-50 min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center justify-center">
            <ImageIcon className="mr-2" size={24} />
            Image Converter & Compressor
          </h1>
        </div>
        
        <div className="p-6 space-y-8">
          {/* File Upload */}
          <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${preview ? 'border-fuchsia-200 bg-fuchsia-50' : 'border-gray-200 hover:border-fuchsia-400'}`}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center justify-center gap-2 bg-fuchsia-500 text-white px-6 py-3 rounded-lg hover:bg-fuchsia-600 transition-colors duration-300 font-medium"
            >
              <Upload size={20} />
              Select Image
            </label>
            {selectedFile ? (
              <p className="mt-3 text-sm text-gray-600">
                Selected: <span className="font-medium">{selectedFile.name}</span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                Supported formats: JPG, PNG, GIF, WebP, BMP
              </p>
            )}
          </div>
          
          {errorMessage && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMessage}
            </div>
          )}
          
          {preview && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h2 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                    <div className="w-3 h-3 rounded-full bg-fuchsia-500 mr-2"></div>
                    Original Image
                  </h2>
                  <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-w-full h-auto"
                    />
                  </div>
                  <div className="mt-3 text-sm text-gray-600 flex items-center justify-between">
                    <span>Size: {originalSize}</span>
                    <span>{dimensions.width} × {dimensions.height}px</span>
                  </div>
                  
                  {imageMetadata && (
                    <div className="mt-3 p-2 bg-fuchsia-50 rounded-lg border border-fuchsia-100">
                      <details className="text-xs">
                        <summary className="text-fuchsia-700 font-medium cursor-pointer">
                          View Original Metadata
                        </summary>
                        <div className="mt-2 grid grid-cols-1 gap-1">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Filename:</span>
                            <span className="text-gray-900">{imageMetadata.filename}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">File type:</span>
                            <span className="text-gray-900">{imageMetadata.fileType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last modified:</span>
                            <span className="text-gray-900">{imageMetadata.lastModified}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Aspect ratio:</span>
                            <span className="text-gray-900">{imageMetadata.aspectRatio}</span>
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="lg:col-span-1 flex items-center justify-center">
                <div className="bg-fuchsia-100 rounded-full p-2">
                  <ArrowRight size={24} className="text-fuchsia-600" />
                </div>
              </div>
              
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h2 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                    <Settings size={18} className="mr-2 text-gray-600" />
                    Conversion Settings
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Output Format
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['jpeg', 'png', 'webp'] as const).map(format => (
                          <button
                            key={format}
                            onClick={() => setOutputFormat(format)}
                            className={`py-2 rounded-lg text-center text-sm transition-colors ${
                              outputFormat === format
                                ? 'bg-fuchsia-500 text-white font-medium'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-fuchsia-300'
                            }`}
                          >
                            {format.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Compression Quality: {compressionLevel}%
                      </label>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">Low</span>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={compressionLevel}
                          onChange={(e) => setCompressionLevel(parseInt(e.target.value))}
                          className="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-500 ml-2">High</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {compressionLevel < 20 && (
                          <span>Smallest file size, visible loss in quality</span>
                        )}
                        {compressionLevel >= 20 && compressionLevel < 40 && (
                          <span>Very small file size, moderate quality loss</span>
                        )}
                        {compressionLevel >= 40 && compressionLevel < 60 && (
                          <span>Balanced compression, acceptable quality</span>
                        )}
                        {compressionLevel >= 60 && compressionLevel < 80 && (
                          <span>Good quality, reasonable file size</span>
                        )}
                        {compressionLevel >= 80 && compressionLevel < 95 && (
                          <span>High quality, minimal visible compression</span>
                        )}
                        {compressionLevel >= 95 && (
                          <span>Maximum quality, minimal compression</span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={processImage}
                      disabled={!selectedFile || isProcessing}
                      className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
                        !selectedFile || isProcessing
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white'
                      }`}
                    >
                      {isProcessing ? 
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </> : 
                        'Convert & Compress'
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {processedImage && (
            <div className="border-t border-gray-100 pt-6">
              <div className={`border rounded-lg p-4 mb-6 flex items-start ${
                calculateReduction() === 'No reduction' 
                  ? 'bg-yellow-50 border-yellow-100' 
                  : 'bg-green-50 border-green-100'
              }`}>
                <div className="flex-shrink-0">
                  {calculateReduction() === 'No reduction' ? (
                    <svg className="h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-800">Processing Complete</h3>
                  <div className="mt-1 text-sm">
                    {calculateReduction() === 'No reduction' ? (
                      <>
                        <span className="text-yellow-700">
                          No size reduction achieved. 
                          {outputFormat === 'png' ? ' PNG format provides lossless quality but often larger file sizes.' : ''}
                        </span>
                      </>
                    ) : (
                      <span className="text-green-700">
                        Size reduction: <span className="font-bold">{calculateReduction()}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h2 className="text-lg font-medium text-gray-800 mb-3">Processed Image</h2>
                  <div className="border rounded-lg overflow-hidden bg-white shadow">
                    <img
                      src={processedImage}
                      alt="Processed"
                      className="max-w-full h-auto"
                    />
                  </div>
                  <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-fuchsia-50 rounded-lg p-3 flex flex-col">
                        <span className="text-gray-500">Original</span>
                        <span className="font-medium text-gray-900">{originalSize}</span>
                      </div>
                      <div className={`rounded-lg p-3 flex flex-col ${calculateReduction() === 'No reduction' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                        <span className="text-gray-500">Compressed</span>
                        <span className="font-medium text-gray-900">{newSize}</span>
                      </div>
                    </div>
                    
                    {/* Image Metadata */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Image Metadata</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <span className="text-gray-500">Dimensions:</span>
                          <span className="ml-1 text-gray-900">{dimensions.width} × {dimensions.height}px</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Format:</span>
                          <span className="ml-1 text-gray-900">{outputFormat.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Quality:</span>
                          <span className="ml-1 text-gray-900">{compressionLevel}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Aspect Ratio:</span>
                          <span className="ml-1 text-gray-900">
                            {(() => {
                              const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                              if (dimensions.width && dimensions.height) {
                                const divisor = gcd(dimensions.width, dimensions.height);
                                return `${dimensions.width/divisor}:${dimensions.height/divisor}`;
                              }
                              return 'N/A';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col justify-center space-y-4">
                  <button
                    onClick={downloadImage}
                    className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-6 py-4 rounded-lg shadow transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <Save size={20} />
                    Download Image
                  </button>
                  <div className="text-center text-gray-500 text-sm">
                    Format: {outputFormat.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ImageConverter;