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
    quantum: 1e12 * 2   // Grover's algorithm gives quadratic speedup
  };
  
  const combinations = Math.pow(2, totalEntropy);
  const crackTimes = {
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

// Get color class based on password strength
export const getStrengthColor = (strength: number): string => {
  if (strength < 0.3) return 'bg-red-500';
  if (strength < 0.6) return 'bg-yellow-500';
  if (strength < 0.8) return 'bg-blue-500';
  return 'bg-green-500';
};

// Get description based on password strength
export const getStrengthDescription = (strength: number): string => {
  if (strength < 0.3) return 'Weak - easily crackable';
  if (strength < 0.6) return 'Moderate - might resist simple attacks';
  if (strength < 0.8) return 'Strong - good for most purposes';
  return 'Very Strong - excellent protection';
};

// Convert number to words
const numberToWords = (num: number): string => {
  if (num === Infinity) return "infinite";
  if (num >= 1e30) return "trillions upon trillions of";
  
  const units = ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion"];
  let unitIndex = 0;
  
  while (num >= 1000 && unitIndex < units.length - 1) {
    num /= 1000;
    unitIndex++;
  }
  
  return `${Math.floor(num)} ${units[unitIndex]}`;
};

// Format time in human-readable format with words
const formatTime = (seconds: number): string => {
  if (seconds === Infinity) return "infinite time";
  if (seconds < 1) return "instant";
  if (seconds > 1e30) return "trillions upon trillions of years";
  
  const years = seconds / 31536000;
  if (years >= 1) {
    return `${numberToWords(years)} years`;
  }
  
  const months = seconds / 2592000;
  if (months >= 1) {
    return `${numberToWords(months)} months`;
  }
  
  const days = seconds / 86400;
  if (days >= 1) {
    return `${numberToWords(days)} days`;
  }
  
  const hours = seconds / 3600;
  if (hours >= 1) {
    return `${numberToWords(hours)} hours`;
  }
  
  const minutes = seconds / 60;
  if (minutes >= 1) {
    return `${numberToWords(minutes)} minutes`;
  }
  
  return `${numberToWords(seconds)} seconds`;
};