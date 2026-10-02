import { useState } from 'react';
import { newId } from '@/shared/lib/id';
import type { DebugLog } from '../types';

/** The player's debug log, newest first, capped at 50 entries. */
export function useDebugLog() {
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);

  const addDebugLog = (
    message: string,
    type: 'info' | 'error' | 'warning' | 'success' = 'info',
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = newId();
    setDebugLogs((prev) => [
      { id, timestamp, message, type },
      ...prev.slice(0, 49),
    ]);
  };

  const clearDebugLogs = () => setDebugLogs([]);

  return { debugLogs, addDebugLog, clearDebugLogs };
}
