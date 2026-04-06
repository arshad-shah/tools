import { CheckCircle, Copy, Info, Key, Lock } from "lucide-react";
import ClaimCard from "./ClaimCard";
import Accordion from "../../../components/Accordion";
import { Button } from "../../../components/Button";

const SignatureSection: React.FC<{
  signature: string;
  algorithm?: string;
  copied: boolean;
  onCopy: (text: string) => void;
}> = ({ signature, algorithm, copied, onCopy }) => (
  <div className="space-y-6">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start">
        <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
        <div className="text-blue-800">
          <div className="font-medium mb-1">About Signatures</div>
          <div className="text-sm">
            The signature verifies that the token hasn't been tampered with and confirms 
            the sender's identity using cryptographic algorithms.
          </div>
        </div>
      </div>
    </div>

    {algorithm && (
      <ClaimCard
        label="Signing Algorithm"
        value={`${algorithm} - ${
          algorithm.includes('HS') ? 'HMAC (symmetric)' : 
          algorithm.includes('RS') ? 'RSA (asymmetric)' : 
          algorithm.includes('ES') ? 'ECDSA (elliptic curve)' : 
          'Other algorithm'
        }`}
        icon={<Lock className="w-4 h-4" />}
        variant="warning"
      />
    )}

    <Accordion
      title="Signature Value" 
      icon={<Key className="w-4 h-4" />}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-gray-700">Base64 Encoded Signature</span>
        <Button
          variant="ghost" 
          size="sm"
          onClick={() => onCopy(signature)}
        >
          {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono break-all">
        {signature}
      </div>
    </Accordion>
  </div>
);

export default SignatureSection;