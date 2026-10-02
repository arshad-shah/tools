import { query } from './escape';

export const COIN_SCHEMES = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  BCH: 'bitcoincash',
} as const;

export type Coin = keyof typeof COIN_SCHEMES;

export const COIN_LABELS: Record<Coin, string> = {
  BTC: 'Bitcoin (BTC)',
  ETH: 'Ethereum (ETH)',
  LTC: 'Litecoin (LTC)',
  DOGE: 'Dogecoin (DOGE)',
  BCH: 'Bitcoin Cash (BCH)',
};

export interface CryptoFields {
  coin: Coin;
  address: string;
  /** In whole coins (ETH is converted to wei). */
  amount: string;
  label: string;
  message: string;
  /** Ethereum only; 1 is mainnet. */
  chainId: string;
}

/** A decimal amount of ether as wei, exactly; null when malformed. */
export function etherToWei(amount: string): string | null {
  const m = /^(\d*)(?:\.(\d{0,18}))?$/.exec(amount.trim());
  if (!m || (m[1] === '' && !m[2])) return null;
  const wei =
    BigInt(m[1] || '0') * 10n ** 18n +
    BigInt((m[2] ?? '').padEnd(18, '0') || '0');
  return wei.toString();
}

/**
 * BIP-21 style URIs (`bitcoin:<address>?amount=&label=&message=`) for
 * Bitcoin-family coins, EIP-681 `ethereum:<address>@<chainId>?value=<wei>`
 * for Ethereum.
 */
export function cryptoPayload(f: CryptoFields): string {
  const scheme = COIN_SCHEMES[f.coin];
  const address = f.address.trim();
  if (f.coin === 'ETH') {
    const chain = f.chainId.trim() ? `@${f.chainId.trim()}` : '';
    const wei = f.amount.trim() ? etherToWei(f.amount) : null;
    return `${scheme}:${address}${chain}${query([['value', wei ?? '']])}`;
  }
  return `${scheme}:${address}${query([
    ['amount', f.amount.trim()],
    ['label', f.label.trim()],
    ['message', f.message.trim()],
  ])}`;
}
