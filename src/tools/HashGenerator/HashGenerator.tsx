import React, { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, Lock } from 'lucide-react';
import * as CryptoJS from 'crypto-js';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../components/select';
import { Textarea } from '../../components/textarea';

// TypeScript interfaces
interface Algorithm {
  id: string;
  name: string;
  function: (input: string) => string;
}

interface HashResult {
  [key: string]: string;
}

// Tool definition constants
const TOOL_IDS = {
  HASH_GENERATOR: 'hash-generator'
};

const toolConfig = {
  id: TOOL_IDS.HASH_GENERATOR,
  name: 'Hash Generator',
  description: 'Generate MD5, SHA-256, and other hash algorithms',
  icon: Lock,
  color: 'bg-yellow-600',
  enabled: true,
  category: 'security',
  version: '1.0.0',
};

const HashGenerator: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [hashes, setHashes] = useState<HashResult>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('all');

  // Define all available hash algorithms using crypto-js
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

  const copyToClipboard = (text: string, algorithm: string): void => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(algorithm);
      setTimeout(() => setCopied(null), 2000);
    });
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
  };

  return (
    <div className="flex flex-col w-full mx-auto p-6 rounded-lg shadow-lg bg-gray-50">
      <div className="flex items-center mb-6 gap-3">
        <div className={`p-2 rounded-md ${toolConfig.color} text-white`}>
          <Lock size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{toolConfig.name}</h1>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-grow">
          <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
            Enter text to hash
          </label>
          <div className="relative">
            <Textarea
              id="text-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
              placeholder="Type or paste text here..."
            />
            {input && (
              <button
                onClick={clearInput}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
                aria-label="Clear input"
              >
                <RefreshCw size={16} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>
        
        <div className="w-full md:w-48 ">
          <label htmlFor="algorithm-select" className="block text-sm font-medium text-gray-700 mb-2">
            Hash Algorithm
          </label>
            <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
              <SelectTrigger className="flex items-center justify-between w-full h-10 px-3 border border-gray-200 bg-white rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent focus:outline-none">
                  <span className="text-gray-700 flex items-center gap-1 font-medium">
                    {selectedAlgorithm === 'all' ? 'All Algorithms' : algorithms.find(algo => algo.id === selectedAlgorithm)?.name}</span>
              </SelectTrigger>
              <SelectContent className="bg-white rounded-md shadow-md border border-gray-200">
                <SelectItem value="all" className="font-medium text-gray-700 flex items-center gap-1">
                  All Algorithms
                  </SelectItem>
                {algorithms.map(algo => (
                  <SelectItem key={algo.id} value={algo.id} className="text-gray-700 flex items-center gap-1">
                    {algo.name}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>

      {Object.keys(hashes).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Hash Results</h2>
          <div className="bg-white rounded-md shadow overflow-hidden">
            {Object.entries(hashes).map(([algorithm, hash]) => {
              const algoInfo = algorithms.find(algo => algo.id === algorithm);
              return (
                <div key={algorithm} className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-700">{algoInfo?.name || algorithm.toUpperCase()}</span>
                    <button
                      onClick={() => copyToClipboard(hash, algorithm)}
                      className="text-yellow-600 hover:text-yellow-800 focus:outline-none flex items-center"
                    >
                      {copied === algorithm ? (
                        <>
                          <Check size={16} className="mr-1" />
                          <span className="text-sm">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} className="mr-1" />
                          <span className="text-sm">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                    {hash}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {!input && (
        <div className="mt-6 text-center text-gray-500 italic">
          Enter text above to generate hash values
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">{toolConfig.description} • v{toolConfig.version}</p>
      </div>
    </div>
  );
};

export default HashGenerator;