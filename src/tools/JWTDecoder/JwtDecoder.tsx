import { useEffect, useMemo, useState } from "react";
import { getExpiryInfo } from "./utils/utils";
import useJWTDecoder from "./hooks/useJWTDecoder";
import useClipboard from "./hooks/useClipboard";
import TokenInput from "./components/TokenInput";
import { Card } from "../../components/Card";
import Alert from "../../components/Alert";
import { ArrowRight, Lock } from "lucide-react";
import { Badge } from "../../components/Badge";
import ExpiryStatus from "./components/ExpiryStatus";
import PayloadSection from "./components/PayloadSection";
import HeaderSection from "./components/HeaderSection";
import SignatureSection from "./components/SignatureSection";

const JWTDecoder: React.FC = () => {
  const { jwt, setJwt, decoded, error, decode, clear } = useJWTDecoder();
  const { copied, copy } = useClipboard();
  const [activeTab, setActiveTab] = useState('payload');

  const sampleJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNhbXBsZS1rZXkifQ.eyJzdWIiOiJ1c2VyLTEyMzQ1IiwibmFtZSI6IkphbmUgRG9lIiwiZW1haWwiOiJqYW5lQGV4YW1wbGUuY29tIiwiaWF0IjoxNzI2MjM5MDIyLCJleHAiOjE3NTc3NzUwMjIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6WyJhcGkuZXhhbXBsZS5jb20iLCJ3ZWIuZXhhbXBsZS5jb20iXSwicm9sZXMiOlsidXNlciIsIm1vZGVyYXRvciJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkOnBvc3RzIiwid3JpdGU6cG9zdHMiLCJtb2RlcmF0ZTpjb21tZW50cyJdLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZ3JvdXBzIjpbImRldmVsb3BlcnMiLCJiZXRhLXVzZXJzIl0sImN1c3RvbV9jbGFpbSI6eyJkZXBhcnRtZW50IjoiZW5naW5lZXJpbmciLCJ0ZWFtX2lkIjo0Mn19.K8Xz9n4rQ6vKm3LpBtY8jE2dR7fN9sA1qW5cT3uI0Mn";

  const expiryInfo = useMemo(() => 
    getExpiryInfo(decoded?.payload.exp), 
    [decoded?.payload.exp]
  );

  // Auto-load sample JWT
  useEffect(() => {
    const timer = setTimeout(() => {
      setJwt(sampleJWT);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSample = () => setJwt(sampleJWT);
  const handleCopy = () => copy(jwt);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Token Input */}
        <TokenInput
          value={jwt}
          onChange={setJwt}
          onDecode={() => decode(jwt)}
          onClear={clear}
          onSample={handleSample}
          copied={copied}
          onCopy={handleCopy}
        />

        {/* Error Display */}
        {error && (
          <Alert
            variant="error"
            className="mb-6"
            dismissible
          >
            <span className="font-medium">Error:</span> {error}
          </Alert>

        )}

        {/* JWT Structure Preview */}
        {decoded && (
          <Card className="mb-6 bg-gray-900 text-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-800 text-gray-300 text-sm font-semibold flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              JWT Structure
            </div>
            <div className="p-4 flex items-center space-x-3 overflow-x-auto">
              <button
                className={`px-4 py-2 rounded text-sm font-mono transition-colors flex items-center ${
                  activeTab === 'header' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab('header')}
              >
                <span className="mr-2">Header</span>
                <Badge variant={activeTab === 'header' ? 'default' : 'info'} size="sm">
                  {decoded.header.alg}
                </Badge>
              </button>
              <ArrowRight className="text-pink-400 w-4 h-4" />
              <button
                className={`px-4 py-2 rounded text-sm font-mono transition-colors flex items-center ${
                  activeTab === 'payload' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab('payload')}
              >
                <span className="mr-2">Payload</span>
                <Badge variant={activeTab === 'payload' ? 'default' : 'info'} size="sm">
                  {Object.keys(decoded.payload).length} claims
                </Badge>
              </button>
              <ArrowRight className="text-pink-400 w-4 h-4" />
              <button
                className={`px-4 py-2 rounded text-sm font-mono transition-colors ${
                  activeTab === 'signature' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab('signature')}
              >
                Signature
              </button>
            </div>
          </Card>
        )}

        {/* Expiry Status */}
        {decoded && <ExpiryStatus expiryInfo={expiryInfo} exp={decoded.payload.exp} />}

        {/* Main Content */}
        {decoded && (
          <Card className="p-6">
            {activeTab === 'payload' && (
              <PayloadSection
                payload={decoded.payload}
                expiryInfo={expiryInfo}
                copied={copied}
                onCopy={copy}
              />
            )}
            {activeTab === 'header' && (
              <HeaderSection
                header={decoded.header}
                copied={copied}
                onCopy={copy}
              />
            )}
            {activeTab === 'signature' && (
              <SignatureSection
                signature={decoded.signature}
                algorithm={decoded.header.alg}
                copied={copied}
                onCopy={copy}
              />
            )}
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 flex items-center justify-center">
          <Lock className="w-4 h-4 mr-2" />
          All processing happens in your browser • No data is sent to any server
        </div>
      </div>
    </div>
  );
};

export default JWTDecoder;