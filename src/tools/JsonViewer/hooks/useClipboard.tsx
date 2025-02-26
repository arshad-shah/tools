import { useState } from "react";

export const useClipboard = (onError?: (error: string) => void) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      onError?.('Failed to copy to clipboard');
    }
  };

  return { isCopied, handleCopy };
};