import React from 'react';
import { IconBitcoin, IconWallet } from '@/shared/ui/icons';

import { Code, Input, Label, Select, Stack } from '@/shared/ui';
import { CRYPTO_OPTIONS } from '../lib/options';
import type { CryptoData, CryptoType } from '../types';

export const CryptoForm: React.FC<{
  cryptoData: CryptoData;
  setCryptoData: (data: Partial<CryptoData>) => void;
}> = ({ cryptoData, setCryptoData }) => (
  <Stack gap="3">
    <Stack gap="2">
      <Label htmlFor="crypto-currency">Cryptocurrency</Label>
      <Select
        id="crypto-currency"
        value={cryptoData.currency}
        onValueChange={(v) => setCryptoData({ currency: v as CryptoType })}
        items={CRYPTO_OPTIONS}
        aria-label="Cryptocurrency"
      />
    </Stack>
    <Stack gap="2">
      <Label htmlFor="crypto-key">Wallet address</Label>
      <Input
        id="crypto-key"
        value={cryptoData.publicKey}
        onChange={(v) => setCryptoData({ publicKey: v })}
        placeholder={`Enter your ${cryptoData.currency} wallet address`}
        leadingSlot={<IconWallet size="sm" />}
      />
    </Stack>
    <Stack gap="2">
      <Label htmlFor="crypto-amount">Amount (optional)</Label>
      <Input
        id="crypto-amount"
        value={cryptoData.amount}
        onChange={(v) => setCryptoData({ amount: v })}
        placeholder="0.00"
        leadingSlot={<IconBitcoin size="sm" />}
      />
    </Stack>
    {cryptoData.publicKey && <Code block>{cryptoData.publicKey}</Code>}
  </Stack>
);
