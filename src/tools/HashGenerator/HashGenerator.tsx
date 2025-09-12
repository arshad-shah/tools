import React, { useState, useEffect } from 'react';
import * as CryptoJS from 'crypto-js';
import { Card, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { Textarea } from '../../components/textarea';
import { Label } from '../../components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/select';
import Alert from '../../components/Alert';
import { Copy, Check, X } from 'lucide-react';
import useClipboard from '../../hooks/useClipboard';

interface Algorithm {
  id: string;
  name: string;
  function: (input: string) => string;
}

interface HashResult {
  [key: string]: string;
}

const HashGenerator: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [hashes, setHashes] = useState<HashResult>({});
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const { copy } = useClipboard();

  const algorithms: Algorithm[] = [
    { id: 'md5', name: 'MD5', function: (input: string) => CryptoJS.MD5(input).toString() },
    { id: 'sha1', name: 'SHA-1', function: (input: string) => CryptoJS.SHA1(input).toString() },
    { id: 'sha256', name: 'SHA-256', function: (input: string) => CryptoJS.SHA256(input).toString() },
    { id: 'sha224', name: 'SHA-224', function: (input: string) => CryptoJS.SHA224(input).toString() },
    { id: 'sha384', name: 'SHA-384', function: (input: string) => CryptoJS.SHA384(input).toString() },
    { id: 'sha512', name: 'SHA-512', function: (input: string) => CryptoJS.SHA512(input).toString() },
    { id: 'sha3', name: 'SHA-3', function: (input: string) => CryptoJS.SHA3(input).toString() },
    { id: 'ripemd160', name: 'RIPEMD-160', function: (input: string) => CryptoJS.RIPEMD160(input).toString() },
    { id: 'hmacmd5', name: 'HMAC-MD5', function: (input: string) => CryptoJS.HmacMD5(input, "key").toString() },
    { id: 'hmacsha1', name: 'HMAC-SHA1', function: (input: string) => CryptoJS.HmacSHA1(input, "key").toString() },
    { id: 'hmacsha256', name: 'HMAC-SHA256', function: (input: string) => CryptoJS.HmacSHA256(input, "key").toString() },
    { id: 'hmacsha512', name: 'HMAC-SHA512', function: (input: string) => CryptoJS.HmacSHA512(input, "key").toString() },
  ];

  const generateHashes = (): void => {
    const newHashes: HashResult = {};
    
    if (selectedAlgorithm === 'all') {
      algorithms.forEach(algo => {
        try {
          newHashes[algo.id] = algo.function(input);
        } catch (error) {
          console.error(`Error generating ${algo.name} hash:`, error);
          newHashes[algo.id] = `Error generating ${algo.name} hash`;
        }
      });
    } else {
      const algorithm = algorithms.find(algo => algo.id === selectedAlgorithm);
      if (algorithm) {
        try {
          newHashes[algorithm.id] = algorithm.function(input);
        } catch (error) {
          console.error(`Error generating ${algorithm.name} hash:`, error);
          newHashes[algorithm.id] = `Error generating ${algorithm.name} hash`;
        }
      }
    }
    
    setHashes(newHashes);
  };

  const copyToClipboard = (text: string, algorithmId: string): void => {
    copy(text);
    setCopiedHash(algorithmId);
    setTimeout(() => {
      setCopiedHash(null);
    }, 2000);
  };

  useEffect(() => {
    if (input) {
      generateHashes();
    } else {
      setHashes({});
    }
  }, [input, selectedAlgorithm]);

  const clearInput = (): void => {
    setInput('');
    setHashes({});
    setCopiedHash(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="border-yellow-200">
          <CardContent className="space-y-6">
            {/* Input Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="input-text" className="text-gray-700">Text to hash</Label>
                {input && (
                  <Button
                    onClick={clearInput}
                    className="bg-transparent hover:bg-yellow-50 text-gray-600 border-0 h-8"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <Textarea
                id="input-text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter text to generate hashes..."
                className="min-h-[100px] border-gray-300 focus:border-yellow-600 focus:ring-yellow-600"
              />
            </div>

            {/* Algorithm Selection */}
            <div className="space-y-2">
              <Label htmlFor="algorithm-select" className="text-gray-700">Hash Algorithm</Label>
              <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                <SelectTrigger id="algorithm-select" className="border-gray-300 focus:border-yellow-600 focus:ring-yellow-600">
                  <SelectValue placeholder="Select an algorithm" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all" className="font-medium hover:bg-yellow-50">
                    All Algorithms
                  </SelectItem>
                  {algorithms.map(algo => (
                    <SelectItem key={algo.id} value={algo.id} className="font-medium hover:bg-yellow-50">
                      {algo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results */}
            {Object.keys(hashes).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Hash Results</h3>
                <div className="space-y-3">
                  {Object.entries(hashes).map(([algorithm, hash]) => {
                    const algoInfo = algorithms.find(algo => algo.id === algorithm);
                    const isError = hash.startsWith('Error');
                    const isCopied = copiedHash === algorithm;
                    
                    return (
                      <Card key={algorithm} className="overflow-hidden border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-gray-700">
                              {algoInfo?.name || algorithm.toUpperCase()}
                            </span>
                            <Button
                              onClick={() => copyToClipboard(hash, algorithm)}
                              size="sm"
                              variant={isCopied ? "success" : "secondary"}
                              className={isCopied 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "bg-yellow-600 hover:bg-yellow-700 text-white"}
                              disabled={isError}
                              leftIcon={isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            >
                              {isCopied ? 'Copied' : 'Copy'}
                            </Button>
                          </div>
                          {isError ? (
                            <Alert variant="error" className="bg-red-50 text-red-700 border-red-200">
                              {hash}
                            </Alert>
                          ) : (
                            <div className="font-mono text-sm p-3 bg-gray-100 text-gray-700 rounded-md overflow-x-auto break-all">
                              {hash}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {!input && (
              <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
                Enter text above to generate hash values
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HashGenerator;