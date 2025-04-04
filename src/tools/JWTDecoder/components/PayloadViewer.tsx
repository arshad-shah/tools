/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Copy, CheckCircle, AlertCircle, Clock, Calendar, User, Shield, EyeOff, Eye, Mail, Info, Globe, Target } from 'lucide-react';

// Define common JWT payload claim types
interface JWTPayload {
  // Standard JWT claims
  iss?: string;         // Issuer
  sub?: string;         // Subject
  aud?: string | string[]; // Audience
  exp?: number;         // Expiration Time
  nbf?: number;         // Not Before
  iat?: number;         // Issued At
  jti?: string;         // JWT ID
  
  // Common custom claims
  name?: string;
  email?: string;
  role?: string | string[];
  permissions?: string[];
  scope?: string;
  groups?: string[];
  
  // Allow any other properties
  [key: string]: any;
}

interface PayloadViewerProps {
  payload: JWTPayload;
  expiryStatus: string;
  copyToClipboard: (text: string) => void;
  copied: boolean;
}

// Helper to categorize claims by type
const ClaimCategories = {
  IDENTITY: ['sub', 'name', 'email', 'preferred_username', 'given_name', 'family_name'],
  ACCESS: ['role', 'roles', 'permissions', 'scope', 'groups', 'authorities'],
  TIME: ['exp', 'iat', 'nbf', 'auth_time'],
  ISSUER: ['iss', 'aud', 'azp', 'client_id'],
  CUSTOM: []
};

const PayloadViewer: React.FC<PayloadViewerProps> = ({ 
  payload, 
  expiryStatus, 
  copyToClipboard, 
  copied 
}) => {
  const [showAll, setShowAll] = useState<boolean>(false);
  
  // Format JSON with indentation
  const formatJSON = (obj: JWTPayload): string => {
    return JSON.stringify(obj, null, 2);
  };
  
  // Format timestamp to human-readable date
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  // Format value based on its type and key
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'null';
    
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Format timestamps for time-related claims
    if (ClaimCategories.TIME.includes(key) && typeof value === 'number') {
      return formatTimestamp(value);
    }
    
    return String(value);
  };
  
  // Determine if a claim belongs to a specific category
  const claimCategory = (key: string): string => {
    if (ClaimCategories.IDENTITY.includes(key)) return 'identity';
    if (ClaimCategories.ACCESS.includes(key)) return 'access';
    if (ClaimCategories.TIME.includes(key)) return 'time';
    if (ClaimCategories.ISSUER.includes(key)) return 'issuer';
    return 'custom';
  };
  
  // Get icon for a claim based on its category or key
  const getClaimIcon = (key: string) => {
    switch (key) {
      case 'sub': return <User className="w-4 h-4" />;
      case 'name': return <User className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'role':
      case 'roles':
      case 'permissions': return <Shield className="w-4 h-4" />;
      case 'iat': return <Calendar className="w-4 h-4" />;
      case 'exp': return <Clock className="w-4 h-4" />;
      case 'nbf': return <AlertCircle className="w-4 h-4" />;
      case 'iss': return <Globe className="w-4 h-4" />;
      case 'aud': return <Target className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };
  
  // Get background and text color for a claim icon
  const getClaimIconStyle = (key: string): { bg: string, text: string } => {
    const category = claimCategory(key);
    
    switch (category) {
      case 'identity':
        return { bg: 'bg-pink-100', text: 'text-pink-700' };
      case 'access':
        return { bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'time':
        return { bg: 'bg-green-100', text: 'text-green-700' };
      case 'issuer':
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };
  
  // Get a human-readable label for a claim
  const getClaimLabel = (key: string): string => {
    switch (key) {
      case 'sub': return 'Subject';
      case 'iss': return 'Issuer';
      case 'aud': return 'Audience';
      case 'exp': return 'Expires';
      case 'nbf': return 'Not Before';
      case 'iat': return 'Issued At';
      case 'jti': return 'JWT ID';
      case 'azp': return 'Authorized Party';
      case 'auth_time': return 'Auth Time';
      default: return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    }
  };
  
  // Get priority claims we always want to show
  const getPriorityKeys = (): string[] => {
    return Object.keys(payload).filter(key => 
      key === 'sub' || key === 'name' || key === 'email' || key === 'role' ||
      key === 'roles' || key === 'permissions'
    );
  };
  
  // Get time-related claims
  const getTimeKeys = (): string[] => {
    return Object.keys(payload).filter(key => 
      key === 'exp' || key === 'iat' || key === 'nbf' || key === 'auth_time'
    );
  };
  
  // Get all non-priority, non-time keys
  const getAdditionalKeys = (): string[] => {
    const priorityKeys = [...getPriorityKeys(), ...getTimeKeys()];
    return Object.keys(payload).filter(key => !priorityKeys.includes(key));
  };
  
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-medium text-pink-700 flex items-center">
          <span className="w-2 h-2 rounded-full bg-pink-500 mr-2"></span>
          JWT Payload (Claims)
        </h3>
        <div className="flex items-center gap-2">
          <button 
            className="text-xs px-3 py-1.5 bg-pink-100 hover:bg-pink-200 rounded-full flex items-center transition-colors shadow-sm text-pink-700"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? <><EyeOff className="w-3 h-3 mr-1" /> Hide Details</> : <><Eye className="w-3 h-3 mr-1" /> Show All</>}
          </button>
          <button 
            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center transition-colors shadow-sm text-gray-700"
            onClick={() => copyToClipboard(JSON.stringify(payload, null, 2))}
          >
            {copied ? <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</> : <><Copy className="w-3 h-3 mr-1" /> Copy JSON</>}
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 p-5 rounded-lg">
        {/* Identity and Priority Claims */}
        {getPriorityKeys().length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-pink-700 mb-3 flex items-center">
              <User className="w-4 h-4 mr-1" /> Identity & Access Claims
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getPriorityKeys().map(key => {
                const iconStyle = getClaimIconStyle(key);
                return (
                  <div key={key} className="bg-white rounded-lg shadow-sm p-4 flex items-center hover:shadow-md transition-shadow">
                    <div className={`${iconStyle.bg} ${iconStyle.text} rounded-full p-2 mr-3`}>
                      {getClaimIcon(key)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-500 text-xs">{getClaimLabel(key)}</span>
                      <div className="font-medium truncate" title={formatValue(key, payload[key])}>
                        {formatValue(key, payload[key])}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Time-related claims */}
        {getTimeKeys().length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-green-700 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-1" /> Time-Based Claims
            </div>
            <div className="grid grid-cols-1 gap-2">
              {getTimeKeys().map(key => (
                <div key={key} className={`px-4 py-3 rounded-lg flex items-center ${
                  key === 'exp' && expiryStatus.includes('expired') 
                    ? 'bg-red-50 text-red-800 border-l-4 border-red-500' 
                    : key === 'exp'
                    ? 'bg-green-50 text-green-700 border-l-4 border-green-500'
                    : 'bg-white text-gray-800'
                }`}>
                  {key === 'exp' && expiryStatus.includes('expired') 
                    ? <AlertCircle className="w-5 h-5 mr-3 text-red-500" />
                    : key === 'exp' 
                    ? <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
                    : getClaimIcon(key)}
                  
                  <div className="flex-1 pl-2">
                    <div className="text-sm font-medium">{getClaimLabel(key)}</div>
                    <div className="text-xs">
                      {formatTimestamp(payload[key])}
                      {key === 'exp' && !expiryStatus.includes('expired') && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                          {expiryStatus.replace('valid-', 'Expires in ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Additional claims */}
        {showAll && getAdditionalKeys().length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Info className="w-4 h-4 mr-1" /> Additional Claims
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {getAdditionalKeys().map(key => {
                const value = payload[key];
                const iconStyle = getClaimIconStyle(key);
                
                return (
                  <div key={key} className="flex items-start">
                    <div className={`${iconStyle.bg} ${iconStyle.text} rounded-full p-1.5 mr-2 mt-0.5`}>
                      {getClaimIcon(key)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">{getClaimLabel(key)}</div>
                      <div className="text-sm break-words">
                        {typeof value === 'object' 
                          ? (
                              <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-24">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            )
                          : formatValue(key, value)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Raw JSON */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-gray-700">Raw JSON</div>
            <button 
              className="text-xs px-2 py-1 bg-pink-50 text-pink-700 rounded hover:bg-pink-100"
              onClick={() => copyToClipboard(formatJSON(payload))}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono">
            {formatJSON(payload)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default PayloadViewer;