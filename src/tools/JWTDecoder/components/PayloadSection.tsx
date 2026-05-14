import { useMemo } from "react";
import { ExpiryInfo, JWTPayload } from "../../../types/JwtTypes";
import Accordion from "../../../components/Accordion";
import { AlertCircle, Braces, CheckCircle, Clock, Copy, Globe, Settings, Shield, User } from "lucide-react";
import ClaimCard from "./ClaimCard";
import { formatTime, getClaimIcon, getClaimLabel } from "../utils/utils";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";

const PayloadSection: React.FC<{
  payload: JWTPayload;
  expiryInfo: ExpiryInfo;
  copied: boolean;
  onCopy: (text: string) => void;
}> = ({ payload, expiryInfo, copied, onCopy }) => {
  const categorizedClaims = useMemo(() => {
    const identity = ['sub', 'name', 'email', 'preferred_username', 'given_name', 'family_name'];
    const access = ['role', 'roles', 'permissions', 'scope', 'groups', 'authorities'];
    const timing = ['exp', 'iat', 'nbf', 'auth_time'];
    const issuer = ['iss', 'aud', 'azp', 'client_id', 'jti'];
    
    const categories = {
      identity: Object.entries(payload).filter(([key]) => identity.includes(key)),
      access: Object.entries(payload).filter(([key]) => access.includes(key)),
      timing: Object.entries(payload).filter(([key]) => timing.includes(key)),
      issuer: Object.entries(payload).filter(([key]) => issuer.includes(key)),
      custom: Object.entries(payload).filter(([key]) => 
        ![...identity, ...access, ...timing, ...issuer].includes(key)
      )
    };
    
    return categories;
  }, [payload]);

  return (
    <div className="space-y-6">
      {/* Identity Claims */}
      {categorizedClaims.identity.length > 0 && (
        <Accordion 
          title="Identity Claims" 
          icon={<User className="w-4 h-4" />}
          defaultOpen={true}
          badge={`${categorizedClaims.identity.length}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categorizedClaims.identity.map(([key, value]) => (
              <ClaimCard
                key={key}
                label={getClaimLabel(key)}
                value={value}
                icon={getClaimIcon(key)}
              />
            ))}
          </div>
        </Accordion>
      )}

      {/* Access Claims */}
      {categorizedClaims.access.length > 0 && (
        <Accordion 
          title="Access & Permissions" 
          icon={<Shield className="w-4 h-4" />}
          defaultOpen={true}
          badge={`${categorizedClaims.access.length}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categorizedClaims.access.map(([key, value]) => (
              <ClaimCard
                key={key}
                label={getClaimLabel(key)}
                value={value}
                icon={getClaimIcon(key)}
                variant="warning"
              />
            ))}
          </div>
        </Accordion>
      )}

      {/* Timing Claims */}
      {categorizedClaims.timing.length > 0 && (
        <Accordion 
          title="Timestamps" 
          icon={<Clock className="w-4 h-4" />}
          defaultOpen={true}
          badge={`${categorizedClaims.timing.length}`}
        >
          <div className="space-y-3">
            {categorizedClaims.timing.map(([key, value]) => {
              const isExpired = key === 'exp' && expiryInfo.isExpired;
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-l-4 ${
                    isExpired 
                      ? 'border-red-500 bg-red-50' 
                      : key === 'exp'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {isExpired ? (
                        <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                      ) : key === 'exp' ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      ) : (
                        <div className="text-gray-400 mr-3">
                          {getClaimIcon(key)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {getClaimLabel(key)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTime(value as number)}
                        </div>
                      </div>
                    </div>
                    {key === 'exp' && !isExpired && (
                      <Badge variant="success">
                        {expiryInfo.timeLeft} left
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Accordion>
      )}

      {/* Issuer Claims */}
      {categorizedClaims.issuer.length > 0 && (
        <Accordion 
          title="Issuer Information" 
          icon={<Globe className="w-4 h-4" />}
          defaultOpen={true}
          badge={`${categorizedClaims.issuer.length}`}
        >
          <div className="grid grid-cols-1 gap-4">
            {categorizedClaims.issuer.map(([key, value]) => (
              <ClaimCard
                key={key}
                label={getClaimLabel(key)}
                value={value}
                icon={getClaimIcon(key)}
              />
            ))}
          </div>
        </Accordion>
      )}

      {/* Custom Claims */}
      {categorizedClaims.custom.length > 0 && (
        <Accordion 
          title="Custom Claims" 
          icon={<Settings className="w-4 h-4" />}
          badge={`${categorizedClaims.custom.length}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categorizedClaims.custom.map(([key, value]) => (
              <ClaimCard
                key={key}
                label={getClaimLabel(key)}
                value={value}
                icon={getClaimIcon(key)}
              />
            ))}
          </div>
        </Accordion>
      )}

      {/* Raw JSON */}
      <Accordion 
        title="Raw JSON" 
        icon={<Braces className="w-4 h-4" />}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700">Complete Payload</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onCopy(JSON.stringify(payload, null, 2))}
          >
            {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </Accordion>
    </div>
  );
};
export default PayloadSection;