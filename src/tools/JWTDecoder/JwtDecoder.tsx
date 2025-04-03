import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle, AlertCircle, Clock, Calendar, User, FileJson, RefreshCw, Trash2, Info, Shield, EyeOff, Eye, Mail } from 'lucide-react';
import PayloadViewer from './components/PayloadViewer';

// Define types for JWT components
interface JWTHeader {
  alg: string;
  typ?: string;
  kid?: string;
  [key: string]: unknown;
}

interface JWTPayload {
  sub?: string;
  name?: string;
  iat?: number;
  exp?: number;
  nbf?: number;
  iss?: string;
  aud?: string | string[];
  jti?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

const JWTDecoder = () => {
  // Example JWT for users to test with
  const sampleJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3MjYyMzkwMjIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.JyuZ2U8UBGkiMJ24Ojmm-EXOxY-xeGkchE_APrH3OHs";
  
  const [jwt, setJwt] = useState('');
  const [header, setHeader] = useState({} as JWTHeader);
  const [payload, setPayload] = useState({} as JWTPayload);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');
  const [expiryStatus, setExpiryStatus] = useState('');
  const [activeTab, setActiveTab] = useState('payload');
  const [copied, setCopied] = useState(false);
  const [tokenParts, setTokenParts] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const decodeJWT = (token) => {
    setError('');
    setHeader({} as JWTHeader);
    setPayload({} as JWTPayload);
    setSignature('');
    setExpiryStatus('');
    setTokenParts([]);
    
    if (!token || token.trim() === '') {
      return;
    }

    // Split the token into parts
    const parts = token.split('.');
    setTokenParts(parts);
    
    if (parts.length !== 3) {
      setError('Invalid JWT format. A JWT should have 3 parts separated by dots.');
      return;
    }

    try {
      // Decode header
      const decodedHeader = JSON.parse(atob(parts[0]));
      setHeader(decodedHeader);

      // Decode payload
      const decodedPayload = JSON.parse(atob(parts[1]));
      setPayload(decodedPayload);

      // Set signature (can't decode this part)
      setSignature(parts[2]);

      // Check expiration
      if (decodedPayload.exp) {
        const expiryDate = new Date(decodedPayload.exp * 1000);
        const now = new Date();
        if (expiryDate < now) {
          setExpiryStatus('expired');
        } else {
          const timeLeft = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
          const days = Math.floor(timeLeft / 86400);
          const hours = Math.floor((timeLeft % 86400) / 3600);
          const minutes = Math.floor((timeLeft % 3600) / 60);
          
          if (days > 0) {
            setExpiryStatus(`valid-${days}d-${hours}h`);
          } else if (hours > 0) {
            setExpiryStatus(`valid-${hours}h-${minutes}m`);
          } else {
            setExpiryStatus(`valid-${minutes}m`);
          }
        }
      }
    } catch (e) {
      setError('Failed to decode JWT: ' + e.message);
    }
  };

  // Function to format JSON with syntax highlighting
  const formatJSON = (obj : object) => {
    return JSON.stringify(obj, null, 2);
  };

  const copyToClipboard = (text : string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  
  // Effect to load the sample JWT when component mounts
  useEffect(() => {
    // Set a small delay to make the UX feel more natural
    const timer = setTimeout(() => {
      setJwt(sampleJWT);
      decodeJWT(sampleJWT);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-50 rounded-xl shadow-lg">
      
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-t-4 border-pink-600">
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Shield className="w-4 h-4 text-pink-600 mr-2" />
          Enter JWT Token
        </label>
        <div className="relative">
          <textarea
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-3 focus:ring-pink-300 focus:border-pink-500 text-sm font-mono shadow-sm transition-all"
            rows={3}
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            placeholder="Paste your JWT here (e.g., eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
          />
          <button 
            className="absolute right-3 top-3 text-gray-400 hover:text-pink-600 transition-colors"
            onClick={() => copyToClipboard(jwt)}
            title="Copy token"
          >
            {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex mt-4 gap-2">
          <button 
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-sm transition-all transform hover:translate-y-px flex items-center font-medium"
            onClick={() => decodeJWT(jwt)}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Decode Token
          </button>
          <button 
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg shadow-sm transition-all flex items-center"
            onClick={() => {setJwt(''); decodeJWT('');}}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </button>
          <button 
            className="px-4 py-2 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg shadow-sm transition-all flex items-center"
            onClick={() => setJwt(sampleJWT)}
          >
            <FileJson className="w-4 h-4 mr-2" /> Sample JWT
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-center animate-pulse">
          <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {tokenParts.length === 3 && (
        <div className="mb-6 overflow-hidden bg-gray-800 rounded-lg shadow-lg">
          <div className="p-3 bg-gray-900 text-gray-400 text-xs font-semibold">
            JWT Structure
          </div>
          <div className="p-4 flex items-center space-x-2 overflow-x-auto">
            <div 
              className={`px-3 py-2 ${activeTab === 'header' ? 'bg-pink-600' : 'bg-pink-800 hover:bg-pink-700'} text-white rounded cursor-pointer transition-colors shadow-sm font-mono text-xs flex items-center`}
              onClick={() => setActiveTab('header')}
              title="Header"
            >
              <span className="mr-2">Header</span>
              {tokenParts[0].substring(0, 12)}...
            </div>
            <div className="text-pink-300 font-bold">.</div>
            <div 
              className={`px-3 py-2 ${activeTab === 'payload' ? 'bg-pink-600' : 'bg-pink-800 hover:bg-pink-700'} text-white rounded cursor-pointer transition-colors shadow-sm font-mono text-xs flex items-center`}
              onClick={() => setActiveTab('payload')}
              title="Payload"
            >
              <span className="mr-2">Payload</span>
              {tokenParts[1].substring(0, 12)}...
            </div>
            <div className="text-pink-300 font-bold">.</div>
            <div 
              className={`px-3 py-2 ${activeTab === 'signature' ? 'bg-pink-600' : 'bg-pink-800 hover:bg-pink-700'} text-white rounded cursor-pointer transition-colors shadow-sm font-mono text-xs flex items-center`}
              onClick={() => setActiveTab('signature')}
              title="Signature"
            >
              <span className="mr-2">Signature</span>
              {tokenParts[2].substring(0, 8)}...
            </div>
          </div>
        </div>
      )}

      {expiryStatus && (
        <div className={`p-4 mb-6 rounded-lg flex items-center ${
          expiryStatus.includes('expired') 
            ? 'bg-red-50 border-l-4 border-red-500 text-red-700' 
            : 'bg-green-50 border-l-4 border-green-500 text-green-700'
        }`}>
          {expiryStatus.includes('expired') 
            ? <Clock className="w-6 h-6 text-red-500 mr-3" /> 
            : <CheckCircle className="w-6 h-6 text-green-500 mr-3" />}
          <div>
            <span className="font-medium text-lg">{expiryStatus.includes('expired') ? 'Token has expired' : 'Token is valid'}</span>
            {!expiryStatus.includes('expired') && (
              <span className="ml-2 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                {expiryStatus.replace('valid-', 'Expires in ')}
              </span>
            )}
            {payload.exp && (
              <div className="text-sm mt-1">
                Expiration: {new Date(payload.exp * 1000).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {(Object.keys(header).length > 0 || Object.keys(payload).length > 0) && (
        <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100">
          <div className="flex border-b border-gray-100">
            <button
              className={`py-4 px-6 flex items-center font-medium transition-colors ${activeTab === 'header' 
                ? 'bg-pink-50 text-pink-700 border-b-2 border-pink-600' 
                : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('header')}
            >
              <span className="w-3 h-3 rounded-full bg-pink-500 mr-2"></span>
              Header
              {header.alg && (
                <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-800 text-xs rounded-full">
                  {header.alg}
                </span>
              )}
            </button>
            <button
              className={`py-4 px-6 flex items-center font-medium transition-colors ${activeTab === 'payload' 
                ? 'bg-pink-50 text-pink-700 border-b-2 border-pink-600' 
                : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('payload')}
            >
              <span className="w-3 h-3 rounded-full bg-pink-500 mr-2"></span>
              Payload
              {payload.sub && (
                <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-800 text-xs rounded-full truncate max-w-xs">
                  {payload.sub.length > 15 ? payload.sub.substring(0, 15) + '...' : payload.sub}
                </span>
              )}
            </button>
            <button
              className={`py-4 px-6 flex items-center font-medium transition-colors ${activeTab === 'signature' 
                ? 'bg-pink-50 text-pink-700 border-b-2 border-pink-600' 
                : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('signature')}
            >
              <span className="w-3 h-3 rounded-full bg-pink-500 mr-2"></span>
              Signature
            </button>
          </div>
          
          <div className="p-6">
            {activeTab === 'header' && (
              <div>
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-medium text-pink-700 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-pink-500 mr-2"></span>
                    JWT Header
                  </h3>
                  <button 
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center transition-colors shadow-sm text-gray-700"
                    onClick={() => copyToClipboard(JSON.stringify(header, null, 2))}
                  >
                    {copied ? <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</> : <><Copy className="w-3 h-3 mr-1" /> Copy JSON</>}
                  </button>
                </div>
                
                <div className="bg-gray-50 p-5 rounded-lg">
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {header.alg && (
                      <div className="flex items-center">
                        <div className="bg-pink-100 text-pink-700 rounded-full p-2 mr-3">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Algorithm</span>
                          <div className="font-medium">{header.alg}</div>
                        </div>
                      </div>
                    )}
                    
                    {header.typ && (
                      <div className="flex items-center">
                        <div className="bg-blue-100 text-blue-700 rounded-full p-2 mr-3">
                          <FileJson className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Type</span>
                          <div className="font-medium">{header.typ}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono">{formatJSON(header)}</pre>
                </div>
              </div>
            )}

            {activeTab === 'payload' && (
              <PayloadViewer 
                payload={payload}
                expiryStatus={expiryStatus}
                copyToClipboard={copyToClipboard}
                copied={copied}
              />
            )}
            
            {activeTab === 'signature' && (
              <div>
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-medium text-pink-700 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-pink-500 mr-2"></span>
                    JWT Signature
                  </h3>
                  <button 
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center transition-colors shadow-sm text-gray-700"
                    onClick={() => copyToClipboard(signature)}
                  >
                    {copied ? <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</> : <><Copy className="w-3 h-3 mr-1" /> Copy Signature</>}
                  </button>
                </div>
                
                <div className="bg-gray-50 p-5 rounded-lg">
                  <div className="mb-5 p-4 bg-pink-50 rounded-lg border-l-4 border-pink-500 text-pink-800">
                    <div className="font-semibold mb-1 flex items-center"><Info className="w-4 h-4 mr-2" /> About the Signature</div>
                    <p className="text-sm">
                      The signature is created using the encoded header, encoded payload, and a secret key.
                      It verifies that the message wasn't changed and confirms the sender's identity.
                    </p>
                  </div>
                  
                  {header.alg && (
                    <div className="mb-5 bg-white rounded-lg shadow-sm p-4">
                      <div className="flex items-center">
                        <div className="bg-pink-100 text-pink-700 rounded-full p-2 mr-3">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Signing Algorithm</span>
                          <div className="font-medium">{header.alg}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {header.alg.includes('HS') ? 'HMAC + SHA (symmetric)' : 
                             header.alg.includes('RS') ? 'RSA + SHA (asymmetric)' : 
                             header.alg.includes('ES') ? 'ECDSA + SHA (elliptic curve)' : 
                             header.alg.includes('PS') ? 'RSA-PSS + SHA (asymmetric)' : 
                             'Unknown algorithm'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="relative">
                    <div className="text-sm font-medium text-gray-700 mb-2">Signature Value</div>
                    <div className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono break-all">
                      {signature}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-6 text-center text-xs text-gray-500">
        Securely decode JWT tokens in your browser • No data is sent to any server
      </div>
    </div>
  );
};

export default JWTDecoder;