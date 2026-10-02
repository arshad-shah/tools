import React from 'react';
import {
  IconCoins,
  IconFileText,
  IconLink,
  IconSettings,
  IconUser,
  IconWifi,
} from '@/shared/ui/icons';

import type {
  EncryptionType,
  ErrorCorrectionLevel,
  QRCodeType,
} from '../types';

export const QR_TYPE_OPTIONS: Array<{
  value: QRCodeType;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: 'url', label: 'URL', icon: <IconLink size="sm" /> },
  { value: 'text', label: 'Text', icon: <IconFileText size="sm" /> },
  { value: 'contact', label: 'Contact', icon: <IconUser size="sm" /> },
  { value: 'wifi', label: 'WiFi', icon: <IconWifi size="sm" /> },
  { value: 'crypto', label: 'Crypto', icon: <IconCoins size="sm" /> },
  {
    value: 'custom',
    label: 'Custom',
    icon: <IconSettings size="sm" />,
  },
];

export const ENCRYPTION_OPTIONS: Array<{
  value: EncryptionType;
  label: string;
}> = [
  { value: 'none', label: 'None' },
  { value: 'aes', label: 'AES-256' },
  { value: 'tripledes', label: 'Triple DES' },
  { value: 'rc4', label: 'RC4' },
  { value: 'rabbit', label: 'Rabbit Stream Cipher' },
];

export const CRYPTO_OPTIONS = [
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'ETH', label: 'Ethereum (ETH)' },
  { value: 'LTC', label: 'Litecoin (LTC)' },
  { value: 'XRP', label: 'Ripple (XRP)' },
  { value: 'DOGE', label: 'Dogecoin (DOGE)' },
  { value: 'ADA', label: 'Cardano (ADA)' },
  { value: 'DOT', label: 'Polkadot (DOT)' },
];

export const WIFI_ENCRYPTION_OPTIONS = [
  { value: 'WPA', label: 'WPA/WPA2/WPA3' },
  { value: 'WEP', label: 'WEP (Legacy)' },
  { value: 'nopass', label: 'None (Open Network)' },
];

export const ERROR_LEVELS: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];
export const ERROR_LEVEL_PCT: Record<ErrorCorrectionLevel, string> = {
  L: '7%',
  M: '15%',
  Q: '25%',
  H: '30%',
};

export const COLOR_PRESETS = [
  { bg: '#FFFFFF', fg: '#000000', name: 'Classic' },
  { bg: '#0F172A', fg: '#FFFFFF', name: 'Dark' },
  { bg: '#FFFFFF', fg: '#10B981', name: 'Emerald' },
  { bg: '#F0FDF4', fg: '#047857', name: 'Green' },
  { bg: '#ECFDF5', fg: '#0D9488', name: 'Teal' },
  { bg: '#FFFFFF', fg: '#0369A1', name: 'Blue' },
];
