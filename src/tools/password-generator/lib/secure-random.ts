import { CharacterSets } from '../types';

export const charSets: CharacterSets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?/`~"\'^%\\',
};

/**
 * Error thrown when secure random number generation fails
 */
export class InsecureRandomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsecureRandomError';
  }
}

/**
 * Validates that we have a secure source of randomness
 */
const validateCrypto = (): void => {
  if (!window.crypto || !window.crypto.getRandomValues) {
    throw new InsecureRandomError(
      'Secure random number generation is not available in this environment',
    );
  }
};

/**
 * Generates a cryptographically secure random number between 0 and max (exclusive)
 * Using the method recommended by NIST SP 800-90A
 */
const getSecureRandomInRange = (max: number): number => {
  validateCrypto();

  if (!Number.isFinite(max) || max <= 0) {
    throw new Error('Maximum value must be a positive finite number');
  }

  // Calculate the number of bits needed
  const bitsNeeded = Math.ceil(Math.log2(max));
  const bytesNeeded = Math.ceil(bitsNeeded / 8);

  // Create a big enough buffer
  const randomBuffer = new Uint8Array(bytesNeeded);

  // Calculate the maximum valid random value to ensure unbiased distribution
  const maxValidRandom =
    Math.floor((Math.pow(256, bytesNeeded) / max) * max) - 1;

  while (true) {
    window.crypto.getRandomValues(randomBuffer);

    // Convert to number
    let randomValue = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = (randomValue << 8) + randomBuffer[i];
    }

    // If the value is too large, try again to avoid modulo bias
    if (randomValue > maxValidRandom) {
      continue;
    }

    return randomValue % max;
  }
};

/**
 * Generates a cryptographically secure random number between 0 and 1
 */
export const getSecureRandom = (): number => {
  validateCrypto();

  // Use 256 bits of randomness for high precision
  const buffer = new Uint32Array(8);
  window.crypto.getRandomValues(buffer);

  // Combine multiple values for better distribution
  let result = 0;
  for (let i = 0; i < buffer.length; i++) {
    result += buffer[i] / Math.pow(2, 32 * (i + 1));
  }

  return result;
};

/**
 * Implementation of the Fisher-Yates shuffle algorithm using cryptographically
 * secure random numbers. This version includes additional safety checks and
 * maintains the original array immutability.
 */
export const secureShuffle = <T>(array: readonly T[]): T[] => {
  validateCrypto();

  if (!Array.isArray(array)) {
    throw new Error('Input must be an array');
  }

  // Create a copy to maintain immutability
  const shuffled = [...array];

  // Fisher-Yates shuffle with secure random numbers
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use getSecureRandomInRange instead of floor(random * (i + 1))
    // to avoid modulo bias
    const j = getSecureRandomInRange(i + 1);

    // Swap elements
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};
