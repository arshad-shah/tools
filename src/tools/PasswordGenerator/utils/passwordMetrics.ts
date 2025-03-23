import { PasswordMetrics } from "../../../types/PasswordGeneratorTypes";

// Calculate password metrics and security estimates
export const calculateMetrics = (pass: string): PasswordMetrics | null => {
  if (!pass) return null;
  
  const uniqueChars = new Set(pass).size;
  const uniqueRatio = uniqueChars / pass.length;
  const entropyPerChar = Math.log2(uniqueChars);
  const totalEntropy = pass.length * entropyPerChar;
  
  // Calculate time to crack with different systems
  const guessesPerSecond = {
    desktop: 1e9,        // 1 billion/second
    distributed: 1e12,   // 1 trillion/second
    quantum: 1e12 * 1000 // 1 quadrillion/second (more realistic for future quantum)
  };
  
  const combinations = Math.pow(2, totalEntropy);
  const crackTimes: { desktop: string; distributed: string; quantum: string; } = {
    desktop: '',
    distributed: '',
    quantum: ''
  };
  
  for (const [system, speed] of Object.entries(guessesPerSecond)) {
    const seconds = combinations / speed;
    crackTimes[system as keyof typeof crackTimes] = formatTime(seconds);
  }
  
  return {
    strength: Math.min(totalEntropy / 128, 1), // Normalized to 0-1, capped at 1
    entropy: totalEntropy,
    uniqueChars,
    uniqueRatio,
    crackTimes
  };
};

// Get color class based on password strength - updated to orange theme
export const getStrengthColor = (strength: number): string => {
  if (strength < 0.3) return 'bg-red-500';
  if (strength < 0.6) return 'bg-amber-500';
  if (strength < 0.8) return 'bg-orange-500';
  return 'bg-green-500';
};

// Get description based on password strength - enhanced descriptions
export const getStrengthDescription = (strength: number): string => {
  if (strength < 0.3) return 'Weak - vulnerable to basic attacks';
  if (strength < 0.6) return 'Moderate - resistant to casual attacks';
  if (strength < 0.8) return 'Strong - good for most purposes';
  return 'Very Strong - excellent protection';
};

// Convert number to words with improved formatting
const numberToWords = (num: number): string => {
  if (num === Infinity) return "infinite";
  if (isNaN(num)) return "unknown";
  if (num >= 1e30) return "trillions upon trillions of";
  
  const units = ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion", "sextillion"];
  let unitIndex = 0;
  
  while (num >= 1000 && unitIndex < units.length - 1) {
    num /= 1000;
    unitIndex++;
  }
  
  // Format with appropriate precision
  let formatted: string;
  if (num >= 100) {
    formatted = Math.floor(num).toString();
  } else if (num >= 10) {
    formatted = num.toFixed(1).replace(/\.0$/, '');
  } else {
    formatted = num.toFixed(2).replace(/\.00$/, '');
  }
  
  return `${formatted} ${units[unitIndex]}`;
};

// Format time in human-readable format with words
const formatTime = (seconds: number): string => {
  if (seconds === Infinity || seconds > 1e32) return "infinite time";
  if (seconds < 0.001) return "instant";
  if (seconds > 1e30) return "trillions upon trillions of years";
  
  const timeUnits = [
    { unit: 'years', seconds: 31536000 },
    { unit: 'months', seconds: 2592000 },
    { unit: 'weeks', seconds: 604800 },
    { unit: 'days', seconds: 86400 },
    { unit: 'hours', seconds: 3600 },
    { unit: 'minutes', seconds: 60 },
    { unit: 'seconds', seconds: 1 }
  ];
  
  for (const { unit, seconds: unitSeconds } of timeUnits) {
    const value = seconds / unitSeconds;
    if (value >= 1) {
      return `${numberToWords(value)} ${unit}`;
    }
  }
  
  return `less than a second`;
};