import React, { useState, useRef, ChangeEvent } from 'react';
import { Upload, Save, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { Label } from '../../components/label';
import Alert from '../../components/Alert';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const img = new window.Image();
      img.onload = () => {
        setDimensions({
          width: img.width,
          height: img.height
        });
        setPreview(event.target?.result as string);
        
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
    const img = new window.Image();
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
      
      ctx.drawImage(img, 0, 0);
      
      try {
        const quality = compressionLevel / 100;
        let processedDataUrl: string;
        
        if (outputFormat === 'png') {
          processedDataUrl = canvas.toDataURL('image/png');
        } else {
          processedDataUrl = canvas.toDataURL(`image/${outputFormat}`, quality);
        }
        
        const base64Data = processedDataUrl.split(',')[1];
        if (!base64Data) {
          throw new Error('Failed to extract base64 data');
        }
        
        const binarySize = Math.ceil(base64Data.length * 0.75);
        
        setProcessedImage(processedDataUrl);
        setNewSize(formatFileSize(binarySize));
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
    
    const getNumericAndUnit = (sizeString: string): { value: number; unit: string } => {
      const match = sizeString.match(/^([\d.]+)\s*(\w+)$/);
      if (!match) return { value: parseFloat(sizeString), unit: 'bytes' };
      return { value: parseFloat(match[1]), unit: match[2].toLowerCase() };
    };
    
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Card className="border-fuchsia-200">
          
          <CardContent className="p-6 space-y-6">
            {/* File Upload */}
            <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              preview ? 'border-fuchsia-300 bg-fuchsia-50' : 'border-gray-300 hover:border-fuchsia-400'
            }`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white"
                leftIcon={<Upload size={20} />}
              >
                Select Image
              </Button>
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
              <Alert variant="error" className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {errorMessage}
              </Alert>
            )}
            
            {preview && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Original Image */}
                  <Card className="border-gray-200">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-fuchsia-500 mr-2"></div>
                        Original Image
                      </h3>
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <img src={preview} alt="Preview" className="w-full h-auto" />
                      </div>
                      <div className="mt-3 text-sm text-gray-600 flex items-center justify-between">
                        <span>Size: {originalSize}</span>
                        <span>{dimensions.width} × {dimensions.height}px</span>
                      </div>
                      
                      {imageMetadata && (
                        <Alert className="mt-3 bg-fuchsia-50 border-fuchsia-200">
                          <details className="text-xs">
                            <summary className="text-fuchsia-700 font-medium cursor-pointer">
                              View Metadata
                            </summary>
                            <div className="mt-2 space-y-1">
                              <div>Filename: {imageMetadata.filename}</div>
                              <div>Type: {imageMetadata.fileType}</div>
                              <div>Modified: {imageMetadata.lastModified}</div>
                              <div>Aspect: {imageMetadata.aspectRatio}</div>
                            </div>
                          </details>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Conversion Settings */}
                  <Card className="border-gray-200">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                        <Settings size={18} className="mr-2 text-gray-600" />
                        Conversion Settings
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="mb-2">Output Format</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['jpeg', 'png', 'webp'] as const).map(format => (
                              <Button
                                key={format}
                                onClick={() => setOutputFormat(format)}
                                variant={outputFormat === format ? 'primary' : 'secondary'}
                                className={outputFormat === format 
                                  ? 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white' 
                                  : 'bg-white hover:bg-fuchsia-50 text-gray-700 border border-gray-200'}
                                size="sm"
                              >
                                {format.toUpperCase()}
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <Label className="mb-2">
                            Compression Quality: {compressionLevel}%
                          </Label>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">Low</span>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              value={compressionLevel}
                              onChange={(e) => setCompressionLevel(parseInt(e.target.value))}
                              className="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                            />
                            <span className="text-xs text-gray-500 ml-2">High</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            {compressionLevel < 40 && 'Small file, lower quality'}
                            {compressionLevel >= 40 && compressionLevel < 70 && 'Balanced size and quality'}
                            {compressionLevel >= 70 && 'High quality, larger file'}
                          </div>
                        </div>
                        
                        <Button
                          onClick={processImage}
                          disabled={!selectedFile || isProcessing}
                          className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white disabled:bg-gray-300"
                        >
                          {isProcessing ? 'Processing...' : 'Convert & Compress'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Processed Result */}
                {processedImage && (
                  <Card className="border-gray-200">
                    <CardContent className="p-6">
                      <Alert 
                        variant={calculateReduction() === 'No reduction' ? 'warning' : 'success'}
                        className={calculateReduction() === 'No reduction' 
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-800 mb-4' 
                          : 'bg-green-50 border-green-200 text-green-800 mb-4'}
                      >
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          <div>
                            <strong>Processing Complete</strong>
                            {calculateReduction() !== 'No reduction' && (
                              <div>Size reduction: <strong>{calculateReduction()}</strong></div>
                            )}
                          </div>
                        </div>
                      </Alert>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <h3 className="text-lg font-medium text-gray-800 mb-3">Processed Image</h3>
                          <div className="border rounded-lg overflow-hidden bg-white">
                            <img src={processedImage} alt="Processed" className="w-full h-auto" />
                          </div>
                          
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <Card className="bg-fuchsia-50 border-fuchsia-200">
                              <CardContent className="p-3">
                                <div className="text-sm text-gray-600">Original</div>
                                <div className="font-semibold text-gray-900">{originalSize}</div>
                              </CardContent>
                            </Card>
                            <Card className={calculateReduction() === 'No reduction' 
                              ? 'bg-yellow-50 border-yellow-200' 
                              : 'bg-green-50 border-green-200'}>
                              <CardContent className="p-3">
                                <div className="text-sm text-gray-600">Compressed</div>
                                <div className="font-semibold text-gray-900">{newSize}</div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                        
                        <div className="flex flex-col justify-center space-y-4">
                          <Button
                            onClick={downloadImage}
                            className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white"
                            size="lg"
                            leftIcon={<Save size={20} />}
                          >
                            Download Image
                          </Button>
                          <div className="text-center text-gray-500 text-sm">
                            Format: {outputFormat.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ImageConverter;