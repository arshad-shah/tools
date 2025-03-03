import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle, AlertCircle, Clock, Calendar, User, Globe, Target, FileJson, RefreshCw, Trash2, Info } from 'lucide-react';

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
// JWT Decoder component with enhanced modern UI
const JWTDecoder: React.FC = () => {


  // Example JWT for users to test with
  const sampleJWT: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3MjYyMzkwMjIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.JyuZ2U8UBGkiMJ24Ojmm-EXOxY-xeGkchE_APrH3OHs";
  
  const [jwt, setJwt] = useState<string>('');
  const [header, setHeader] = useState<JWTHeader>({} as JWTHeader);
  const [payload, setPayload] = useState<JWTPayload>({} as JWTPayload);
  const [signature, setSignature] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [expiryStatus, setExpiryStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'header' | 'payload' | 'signature'>('payload');
  const [copied, setCopied] = useState<boolean>(false);
  const [tokenParts, setTokenParts] = useState<string[]>([]);

  const decodeJWT = (token: string): void => {
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
    const parts: string[] = token.split('.');
    setTokenParts(parts);
    
    if (parts.length !== 3) {
      setError('Invalid JWT format. A JWT should have 3 parts separated by dots.');
      return;
    }

    try {
      // Decode header
      const decodedHeader: JWTHeader = JSON.parse(atob(parts[0]));
      setHeader(decodedHeader);

      // Decode payload
      const decodedPayload: JWTPayload = JSON.parse(atob(parts[1]));
      setPayload(decodedPayload);

      // Set signature (can't decode this part)
      setSignature(parts[2]);

      // Check expiration
      if (decodedPayload.exp) {
        const expiryDate: Date = new Date(decodedPayload.exp * 1000);
        const now: Date = new Date();
        if (expiryDate < now) {
          setExpiryStatus('expired');
        } else {
          const timeLeft: number = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
          const days: number = Math.floor(timeLeft / 86400);
          const hours: number = Math.floor((timeLeft % 86400) / 3600);
          const minutes: number = Math.floor((timeLeft % 3600) / 60);
          
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
      const error = e as Error;
      setError('Failed to decode JWT: ' + error.message);
    }
  };

  // Function to format JSON with syntax highlighting
  const formatJSON = (obj: JWTHeader | JWTPayload): string => {
    return JSON.stringify(obj, null, 2);
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Effect to decode JWT when it changes
  useEffect(() => {
    if (jwt) {
      decodeJWT(jwt);
    }
  }, [jwt]);
  
  // Effect to load the sample JWT when component mounts
  useEffect(() => {
    // Set a small delay to make the UX feel more natural
    const timer: NodeJS.Timeout = setTimeout(() => {
      setJwt(sampleJWT);
      decodeJWT(sampleJWT);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-50 rounded-xl shadow-lg">
      
      <div className="bg-white p-5 rounded-xl shadow-sm mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter JWT Token
        </label>
        <div className="relative">
          <textarea
            className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm font-mono"
            rows={3}
            value={jwt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJwt(e.target.value)}
            placeholder="Paste your JWT here (e.g., eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
          />
          <button 
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            onClick={() => copyToClipboard(jwt)}
            title="Copy token"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex mt-3">
          <button 
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm transition-all transform hover:scale-105 flex items-center"
            onClick={() => decodeJWT(jwt)}
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Decode Token
          </button>
          <button 
            className="ml-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg shadow-sm transition-all flex items-center"
            onClick={() => {setJwt(''); decodeJWT('');}}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Clear
          </button>
          <button 
            className="ml-2 px-4 py-2 bg-blue-200 hover:bg-blue-300 text-blue-700 rounded-lg shadow-sm transition-all flex items-center"
            onClick={() => setJwt(sampleJWT)}
          >
            <FileJson className="w-4 h-4 mr-1" /> Sample JWT
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {tokenParts.length === 3 && (
        <div className="mb-6 overflow-x-auto bg-gray-800 p-4 rounded-lg text-xs font-mono">
          <div className="flex space-x-1">
            <div 
              className="px-3 py-2 bg-blue-500 text-white rounded cursor-pointer"
              onClick={() => setActiveTab('header')}
              title="Header"
            >
              {tokenParts[0]}
            </div>
            <div className="text-gray-400 py-2">.</div>
            <div 
              className="px-3 py-2 bg-purple-500 text-white rounded cursor-pointer"
              onClick={() => setActiveTab('payload')}
              title="Payload"
            >
              {tokenParts[1]}
            </div>
            <div className="text-gray-400 py-2">.</div>
            <div 
              className="px-3 py-2 bg-green-500 text-white rounded cursor-pointer"
              onClick={() => setActiveTab('signature')}
              title="Signature"
            >
              {tokenParts[2].substring(0, 10)}...
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
          <span className="mr-2 text-lg">{expiryStatus.includes('expired') 
            ? <Clock className="w-5 h-5 text-red-500" /> 
            : <CheckCircle className="w-5 h-5 text-green-500" />}</span>
          <div>
            <span className="font-medium">Token {expiryStatus.includes('expired') ? 'has expired' : 'is valid'}</span>
            {!expiryStatus.includes('expired') && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                {expiryStatus.replace('valid-', 'Expires in ')}
              </span>
            )}
            {payload.exp && (
              <div className="text-xs mt-1">
                {new Date(payload.exp * 1000).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {(Object.keys(header).length > 0 || Object.keys(payload).length > 0) && (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          <div className="flex border-b border-gray-100">
            <button
              className={`py-3 px-6 flex items-center ${activeTab === 'header' 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500 font-semibold' 
                : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('header')}
            >
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
              Header
              {header.alg && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {header.alg}
                </span>
              )}
            </button>
            <button
              className={`py-3 px-6 flex items-center ${activeTab === 'payload' 
                ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500 font-semibold' 
                : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('payload')}
            >
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
              Payload
              {payload.sub && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full truncate max-w-xs">
                  {payload.sub.length > 15 ? payload.sub.substring(0, 15) + '...' : payload.sub}
                </span>
              )}
            </button>
            <button
              className={`py-3 px-6 flex items-center ${activeTab === 'signature' 
                ? 'bg-green-50 text-green-700 border-b-2 border-green-500 font-semibold' 
                : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('signature')}
            >
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              Signature
            </button>
          </div>
          
          <div className="p-5">
            {activeTab === 'header' && (
              <div>
                <div className="flex justify-between mb-3">
                  <h3 className="text-lg font-medium text-blue-700 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                    Header
                  </h3>
                  <button 
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center"
                    onClick={() => copyToClipboard(JSON.stringify(header, null, 2))}
                  >
                    {copied ? <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</> : <><Copy className="w-3 h-3 mr-1" /> Copy JSON</>}
                  </button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  {header.alg && (
                    <div className="mb-3 flex items-center">
                      <span className="text-gray-500 text-sm mr-2">Algorithm:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {header.alg}
                      </span>
                    </div>
                  )}
                  {header.typ && (
                    <div className="mb-3 flex items-center">
                      <span className="text-gray-500 text-sm mr-2">Type:</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {header.typ}
                      </span>
                    </div>
                  )}
                  <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono">{formatJSON(header)}</pre>
                </div>
              </div>
            )}
            
            {activeTab === 'payload' && (
              <div>
                <div className="flex justify-between mb-3">
                  <h3 className="text-lg font-medium text-purple-700 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                    Payload
                  </h3>
                  <button 
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center"
                    onClick={() => copyToClipboard(JSON.stringify(payload, null, 2))}
                  >
                    {copied ? <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</> : <><Copy className="w-3 h-3 mr-1" /> Copy JSON</>}
                  </button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {payload.sub && (
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-xs text-gray-500 flex items-center"><User className="w-3 h-3 mr-1" /> Subject</span>
                        <div className="font-medium truncate" title={payload.sub}>
                          {payload.sub}
                        </div>
                      </div>
                    )}
                    
                    {payload.iss && (
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-xs text-gray-500 flex items-center"><Globe className="w-3 h-3 mr-1" /> Issuer</span>
                        <div className="font-medium truncate" title={payload.iss}>
                          {payload.iss}
                        </div>
                      </div>
                    )}
                    
                    {payload.aud && (
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-xs text-gray-500 flex items-center"><Target className="w-3 h-3 mr-1" /> Audience</span>
                        <div className="font-medium truncate" title={typeof payload.aud === 'string' ? payload.aud : JSON.stringify(payload.aud)}>
                          {typeof payload.aud === 'string' ? payload.aud : JSON.stringify(payload.aud)}
                        </div>
                      </div>
                    )}
                    
                    {payload.jti && (
                      <div className="p-3 bg-white rounded-lg shadow-sm">
                        <span className="text-xs text-gray-500">JWT ID</span>
                        <div className="font-medium truncate" title={payload.jti}>
                          {payload.jti}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Time-related claims */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-3">
                      {payload.iat && (
                        <div className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full flex items-center">
                          <Calendar className="w-3 h-3 mr-1" /> <span className="mr-1 text-xs">Issued at:</span>
                          <span className="font-medium">{new Date(payload.iat * 1000).toLocaleString()}</span>
                        </div>
                      )}
                      
                      {payload.exp && (
                        <div className={`px-3 py-1 text-sm rounded-full flex items-center ${
                          expiryStatus.includes('expired') 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          <Clock className="w-3 h-3 mr-1" /> <span className="mr-1 text-xs">Expires:</span>
                          <span className="font-medium">{new Date(payload.exp * 1000).toLocaleString()}</span>
                        </div>
                      )}
                      
                      {payload.nbf && (
                        <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" /> <span className="mr-1 text-xs">Not before:</span>
                          <span className="font-medium">{new Date(payload.nbf * 1000).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono">{formatJSON(payload)}</pre>
                </div>
              </div>
            )}
            
            {activeTab === 'signature' && (
              <div>
                <div className="flex justify-between mb-3">
                  <h3 className="text-lg font-medium text-green-700 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    Signature
                  </h3>
                  <button 
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center"
                    onClick={() => copyToClipboard(signature)}
                  >
                    {copied ? <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</> : <><Copy className="w-3 h-3 mr-1" /> Copy Signature</>}
                  </button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
                    <div className="font-semibold mb-1 flex items-center"><Info className="w-4 h-4 mr-1" /> About the signature</div>
                    <p className="text-sm">
                      The signature is used to verify the sender of the JWT and ensure the message wasn't changed. 
                      It's created using the header, payload, and a secret key.
                    </p>
                  </div>
                  
                  <div className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono break-all">
                    {signature}
                  </div>
                  
                  {header.alg && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="font-semibold text-sm text-blue-700 mb-1">Signing Algorithm</div>
                      <div className="flex items-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {header.alg}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {header.alg.includes('HS') ? 'HMAC + SHA' : 
                           header.alg.includes('RS') ? 'RSA + SHA' : 
                           header.alg.includes('ES') ? 'ECDSA + SHA' : 
                           header.alg.includes('PS') ? 'RSA-PSS + SHA' : 'Unknown algorithm'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JWTDecoder;