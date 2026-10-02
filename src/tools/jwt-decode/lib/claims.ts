import { ExpiryInfo } from '../types';
import { isExpired } from './jwt';

const formatTime = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

const getExpiryInfo = (
  exp?: number,
  nowMs = Date.now(),
  skewSec = 0,
): ExpiryInfo => {
  if (!exp) return { isExpired: false };

  const expiryDate = new Date(exp * 1000);
  const now = new Date(nowMs);
  // Same rule as timeClaimsStatus, so the two never disagree.
  if (isExpired(exp, nowMs / 1000, skewSec)) {
    return { isExpired: true, expiryDate };
  }

  const timeLeft = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  let timeString: string;
  if (days > 0) timeString = `${days}d ${hours}h`;
  else if (hours > 0) timeString = `${hours}h ${minutes}m`;
  else timeString = `${minutes}m`;

  return { isExpired: false, timeLeft: timeString, expiryDate };
};

const getClaimLabel = (key: string): string => {
  const labels: Record<string, string> = {
    sub: 'Subject',
    iss: 'Issuer',
    aud: 'Audience',
    exp: 'Expires',
    nbf: 'Not Before',
    iat: 'Issued At',
    jti: 'JWT ID',
    azp: 'Authorized Party',
    auth_time: 'Auth Time',
  };
  return (
    labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
  );
};

export { formatTime, getExpiryInfo, getClaimLabel };
