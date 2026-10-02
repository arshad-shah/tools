import { useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { loadTextFile } from '@/shared/lib/files';
import { useJob } from '@/shared/state/useJob';
import {
  parseDelimited,
  type DelimiterChoice,
  type ParseResult,
} from '../lib/parse';

export interface DataState extends ParseResult {
  fileName: string;
  /** Kept so a delimiter change can re-parse without reopening the file. */
  text: string;
}

const SAMPLE =
  'Name,Age,City,Salary\nJohn,28,New York,75000\nSarah,32,San Francisco,92000\nMike,45,Chicago,68000\nEmma,37,Boston,83000\nDavid,29,Seattle,79000';

/**
 * Loading and parsing: file upload (as a job), sample data, delimiter
 * re-parse. `onShow` runs whenever a new table is shown.
 */
export function useCsvData(onShow: (next: DataState) => void) {
  const [dataState, setDataState] = useState<DataState | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [delimiterChoice, setDelimiterChoice] =
    useState<DelimiterChoice>('auto');
  const loadJob = useJob(
    async (_ctx, file: File, choice: DelimiterChoice): Promise<DataState> => {
      const { name, text } = await loadTextFile(file, {
        // .txt parsed as CSV before (dropped files skip the accept filter).
        extensions: ['csv', 'tsv', 'txt'],
      });
      return { ...parseDelimited(text, choice), fileName: name, text };
    },
  );
  const loading = loadJob.status === 'running';
  const parseError = loadJob.error?.message ?? sampleError;

  const showData = (next: DataState) => {
    setDataState(next);
    onShow(next);
  };

  const processFile = async (file: File) => {
    setSampleError(null);
    const r = await loadJob.run(file, delimiterChoice);
    if (r) showData(r);
  };

  /** True when the text parsed and is now shown. */
  const parseText = (
    text: string,
    fileName: string,
    choice: DelimiterChoice,
  ): boolean => {
    loadJob.reset();
    try {
      showData({ ...parseDelimited(text, choice), fileName, text });
      setSampleError(null);
      return true;
    } catch (e) {
      setSampleError(toToolError(e).message);
      return false;
    }
  };

  const loadSample = () => {
    parseText(SAMPLE, 'Sample Data', delimiterChoice);
  };

  const changeDelimiter = (value: string) => {
    const choice = value as DelimiterChoice;
    // On failure the select stays on the delimiter the shown table used,
    // never on one that does not match the data.
    if (!dataState || parseText(dataState.text, dataState.fileName, choice))
      setDelimiterChoice(choice);
  };

  const clear = () => {
    setDataState(null);
    loadJob.reset();
    setSampleError(null);
  };

  return {
    dataState,
    delimiterChoice,
    loading,
    parseError,
    processFile,
    loadSample,
    changeDelimiter,
    clear,
  };
}
