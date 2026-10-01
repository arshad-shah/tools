import {
  AlertCircle,
  Calendar,
  Clock,
  Globe,
  Hash,
  Info,
  Key,
  Mail,
  Shield,
  Target,
  User,
  Zap,
} from 'lucide-react';
import { ExpiryInfo } from '../../../types/JwtTypes';

const formatTime = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

const getExpiryInfo = (exp?: number): ExpiryInfo => {
  if (!exp) return { isExpired: false };

  const expiryDate = new Date(exp * 1000);
  const now = new Date();
  const isExpired = expiryDate < now;

  if (isExpired) {
    return { isExpired: true, expiryDate };
  }

  const timeLeft = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  let timeString = '';
  if (days > 0) timeString = `${days}d ${hours}h`;
  else if (hours > 0) timeString = `${hours}h ${minutes}m`;
  else timeString = `${minutes}m`;

  return { isExpired: false, timeLeft: timeString, expiryDate };
};

const getClaimIcon = (key: string) => {
  const icons: Record<string, React.ReactNode> = {
    sub: <User size={16} />,
    name: <User size={16} />,
    email: <Mail size={16} />,
    role: <Shield size={16} />,
    roles: <Shield size={16} />,
    permissions: <Key size={16} />,
    iat: <Calendar size={16} />,
    exp: <Clock size={16} />,
    nbf: <AlertCircle size={16} />,
    iss: <Globe size={16} />,
    aud: <Target size={16} />,
    scope: <Zap size={16} />,
    jti: <Hash size={16} />,
  };
  return icons[key] || <Info size={16} />;
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

export { formatTime, getExpiryInfo, getClaimIcon, getClaimLabel };
