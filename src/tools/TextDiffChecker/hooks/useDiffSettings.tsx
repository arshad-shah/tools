import { useCallback, useState } from "react";
import { DiffSettings } from "../../../types/TextDiffCheckerTypes";

const useDiffSettings = () => {
  const [diffSettings, setDiffSettings] = useState<DiffSettings>({
    ignoreWhitespace: false,
    ignoreCase: false,
    wordByWord: false,
    showLineNumbers: true,
    contextLines: 3,
    trimTrailingWhitespace: true,
    highlightIntralineChanges: true,
    syntaxHighlighting: false,
    ignoreEmptyLines: false,
    trimNewlines: false
  });

  const updateDiffSetting = useCallback((key: keyof DiffSettings, value: boolean | number) => {
    setDiffSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setDiffSettings({
      ignoreWhitespace: false,
      ignoreCase: false,
      wordByWord: false,
      showLineNumbers: true,
      contextLines: 3,
      trimTrailingWhitespace: true,
      highlightIntralineChanges: true,
      syntaxHighlighting: false,
      ignoreEmptyLines: false,
      trimNewlines: false
    });
  }, []);

  return { diffSettings, updateDiffSetting, resetSettings };
};

export default useDiffSettings;