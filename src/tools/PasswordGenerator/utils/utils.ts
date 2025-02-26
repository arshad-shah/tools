import { CharacterSets } from "../../../types/PasswordGeneratorTypes";


export const charSets: CharacterSets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?/`~"\'^%\\'
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
      'Secure random number generation is not available in this environment'
    );
  }
};

/**
 * Generates a cryptographically secure random number between 0 and max (exclusive)
 * Using the method recommended by NIST SP 800-90A
 */
export const getSecureRandomInRange = (max: number): number => {
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
  const maxValidRandom = Math.floor((Math.pow(256, bytesNeeded) / max) * max) - 1;
  
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

/**
 * Generates a cryptographically secure random integer between min and max (inclusive)
 */
export const getSecureRandomInt = (min: number, max: number): number => {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('Min and max must be integers');
  }
  
  if (min > max) {
    throw new Error('Min must be less than or equal to max');
  }

  const range = max - min + 1;
  return min + getSecureRandomInRange(range);
};

/**
 * Generates an array of cryptographically secure random bytes
 */
export const getSecureRandomBytes = (length: number): Uint8Array => {
  validateCrypto();

  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('Length must be a positive integer');
  }

  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
};


/**
 * Checks if a password contains a character from a specific set
 * 
 * @param password The password to check
 * @param charset The character set to check against
 * @returns True if the password contains at least one character from the set
 */
export function containsFromCharset(password: string, charset: string): boolean {
  return [...password].some(char => charset.includes(char));
}

/**
 * Analyzes password composition
 * 
 * @param password The password to analyze
 * @returns An object with the character composition
 */
export function analyzePasswordComposition(password: string): Record<string, boolean> {
  return {
    hasUppercase: containsFromCharset(password, charSets.uppercase),
    hasLowercase: containsFromCharset(password, charSets.lowercase),
    hasNumbers: containsFromCharset(password, charSets.numbers),
    hasSpecial: containsFromCharset(password, charSets.special)
  };
}