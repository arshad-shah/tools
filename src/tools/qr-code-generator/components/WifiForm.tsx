import React from 'react';
import { IconKeyRound, IconWifi } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Checkbox,
  Inline,
  Input,
  Label,
  Select,
  Stack,
} from '@/shared/ui';
import { WIFI_ENCRYPTION_OPTIONS } from '../lib/options';
import type { WifiData } from '../types';

export const WifiForm: React.FC<{
  wifiData: WifiData;
  setWifiData: (data: Partial<WifiData>) => void;
}> = ({ wifiData, setWifiData }) => {
  return (
    <Stack gap="3">
      <Stack gap="2">
        <Label htmlFor="wifi-ssid">Network name (SSID)</Label>
        <Input
          id="wifi-ssid"
          value={wifiData.ssid}
          onChange={(v) => setWifiData({ ssid: v })}
          placeholder="Enter network name"
          leadingSlot={<IconWifi size="sm" />}
        />
      </Stack>
      <Stack gap="2">
        <Label htmlFor="wifi-password">Password</Label>
        <Input
          id="wifi-password"
          type="password"
          value={wifiData.password}
          onChange={(v) => setWifiData({ password: v })}
          placeholder="Enter network password"
          leadingSlot={<IconKeyRound size="sm" />}
        />
      </Stack>
      <Stack gap="2">
        <Label htmlFor="wifi-encryption">Encryption</Label>
        <Select
          id="wifi-encryption"
          value={wifiData.encryption}
          onValueChange={(v) => setWifiData({ encryption: v })}
          items={WIFI_ENCRYPTION_OPTIONS}
          aria-label="Encryption type"
        />
        {wifiData.encryption === 'WEP' && (
          <Alert status="warning">
            <AlertDescription>
              WEP is considered insecure and deprecated. Use WPA2/WPA3 if
              possible.
            </AlertDescription>
          </Alert>
        )}
      </Stack>
      <Inline align="center" gap="2">
        <Checkbox
          checked={wifiData.isHidden}
          onCheckedChange={(c) => setWifiData({ isHidden: Boolean(c) })}
          aria-label="Hidden network"
        />
        <Label>Hidden network</Label>
      </Inline>
    </Stack>
  );
};
