import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Split, Download, Trash, RotateCcw, ArrowRightLeft, Check, Play, Code, BarChart2, AlertTriangle, Loader, MoveRight, Sparkles } from 'lucide-react';
import Notification from './components/Notification';
import { DiffSegment, DiffViewMode } from '../../types/TextDiffCheckerTypes';
import useNotification from './hooks/useNotification';
import useDiffSettings from './hooks/useDiffSettings';
import * as Diff from 'diff';
import useIntelligentDiff from './hooks/useIntelligentDiff';
import GlassCard from './components/GlassCard';
import Button from './components/Button';
import StatCard from './components/StatCard';
import TextArea from './components/TextArea';

const TextDiffChecker: React.FC = () => {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [diffViewMode, setDiffViewMode] = useState('split');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [highlightMode, setHighlightMode] = useState<'character' | 'word' | 'line'>('word');

  const { notification, showNotification } = useNotification();
  const { diffSettings, updateDiffSetting, resetSettings } = useDiffSettings();
  
  // Use the intelligent diff hook
  const {
    diffSegments,
    diffStats,
    isDiffing,
    performanceWarning,
    calculateDiff,
    debouncedCalculateDiff,
    clearDiff
  } = useIntelligentDiff();

  const leftFileInputRef = useRef<HTMLInputElement>(null);
  const rightFileInputRef = useRef<HTMLInputElement>(null);

  const viewModes: DiffViewMode[] = [
    { id: 'split', name: 'Split View', icon: <Split className="h-4 w-4" /> },
    { id: 'unified', name: 'Unified', icon: <MoveRight className="h-4 w-4" /> },
    { id: 'inline', name: 'Inline', icon: <Code className="h-4 w-4" /> }
  ];

  // Auto-refresh effect using the intelligent diff hook
  useEffect(() => {
    if (autoRefresh && (leftText || rightText)) {
      debouncedCalculateDiff(leftText, rightText, diffSettings, highlightMode);
    }
  }, [leftText, rightText, autoRefresh, diffSettings, highlightMode, debouncedCalculateDiff]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => showNotification('Copied to clipboard!', 'success'))
      .catch(() => showNotification('Failed to copy', 'error'));
  }, [showNotification]);

  const handleFileUpload = useCallback((side: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('File too large. Maximum size is 10MB.', 'error');
      return;
    }

    // Check file type
    const allowedTypes = ['text/plain', 'text/csv', 'application/json', 'text/html', 'text/css', 'text/javascript'];
    const isTextFile = allowedTypes.includes(file.type) || file.name.match(/\.(txt|md|json|html|css|js|ts|jsx|tsx|xml|yaml|yml|log)$/i);
    
    if (!isTextFile) {
      showNotification('Please select a text file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (side === 'left') {
        setLeftText(content);
      } else {
        setRightText(content);
      }
      showNotification(`${file.name} loaded successfully`, 'success');
    };
    reader.onerror = () => {
      showNotification('Failed to read file', 'error');
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  }, [showNotification]);

  const triggerFileUpload = useCallback((side: 'left' | 'right') => {
    if (side === 'left') {
      leftFileInputRef.current?.click();
    } else {
      rightFileInputRef.current?.click();
    }
  }, []);

  const swapTexts = useCallback(() => {
    const temp = leftText;
    setLeftText(rightText);
    setRightText(temp);
    showNotification('Texts swapped', 'info');
  }, [leftText, rightText, showNotification]);

  const clearAll = useCallback(() => {
    if (leftText || rightText) {
      setLeftText('');
      setRightText('');
      clearDiff();
      showNotification('All cleared', 'info');
    }
  }, [leftText, rightText, clearDiff, showNotification]);

  const exportResults = useCallback(() => {
    if (!diffSegments.length) {
      showNotification('No diff results to export', 'error');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      statistics: diffStats,
      settings: diffSettings,
      results: diffSegments.map(segment => ({
        text: segment.text,
        type: segment.type || (segment.added ? 'added' : segment.removed ? 'removed' : 'unchanged'),
        lineNumber: segment.lineNumber
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diff-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Results exported successfully', 'success');
  }, [diffSegments, diffStats, diffSettings, showNotification]);

  const manualRefresh = useCallback(() => {
    if (!autoRefresh) {
      try {
        calculateDiff(leftText, rightText, diffSettings, highlightMode);
        showNotification('Diff recalculated', 'info');
      } catch {
        showNotification('Error calculating differences', 'error');
      }
    }
  }, [autoRefresh, calculateDiff, leftText, rightText, diffSettings, highlightMode, showNotification]);

  // Render individual word/character differences for intraline highlighting
  const renderInlineDifferences = useCallback((text1: string, text2: string, isLeftSide: boolean = true) => {
    if (!text1 && !text2) return <span className="text-white/50 italic">(empty line)</span>;
    if (text1 === text2) return <span className="text-white/90">{text1}</span>;

    // Use word-level or character-level diff based on highlight mode
    const diffResult = highlightMode === 'character' 
      ? Diff.diffChars(text1, text2)
      : Diff.diffWordsWithSpace(text1, text2);

    return (
      <>
        {diffResult.map((part, index) => {
          // For left side, show removed and unchanged parts
          if (isLeftSide) {
            if (part.added) return null; // Don't show added parts on left side
            return (
              <span
                key={index}
                className={
                  part.removed
                    ? 'bg-red-600/40 text-red-200 rounded px-1 font-semibold'
                    : 'text-white/90'
                }
              >
                {part.value}
              </span>
            );
          } else {
            // For right side, show added and unchanged parts
            if (part.removed) return null; // Don't show removed parts on right side
            return (
              <span
                key={index}
                className={
                  part.added
                    ? 'bg-emerald-600/40 text-emerald-200 rounded px-1 font-semibold'
                    : 'text-white/90'
                }
              >
                {part.value}
              </span>
            );
          }
        })}
      </>
    );
  }, [highlightMode]);

  // Render a single diff segment with proper highlighting
  const renderDiffSegment = useCallback((segment: DiffSegment, isLeftSide: boolean = true, comparisonText?: string) => {
    // For word/character level diffs (isIntraline), highlight the segment directly
    if (segment.isIntraline) {
      return (
        <span
          className={`rounded px-1 ${
            segment.added
              ? 'bg-emerald-600/40 text-emerald-200 font-semibold'
              : segment.removed
              ? 'bg-red-600/40 text-red-200 font-semibold'
              : 'text-white/90'
          }`}
        >
          {segment.text}
        </span>
      );
    }

    // For line-level diffs with intraline changes enabled
    if (diffSettings.highlightIntralineChanges && comparisonText && segment.text !== comparisonText) {
      return renderInlineDifferences(
        isLeftSide ? segment.text : comparisonText,
        isLeftSide ? comparisonText : segment.text,
        isLeftSide
      );
    }

    // Default rendering
    return <span className="text-white/90">{segment.text || <span className="text-white/50 italic">(empty line)</span>}</span>;
  }, [diffSettings.highlightIntralineChanges, renderInlineDifferences]);

  const renderDiffContent = () => {
    if (isDiffing) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader className="h-8 w-8 text-violet-400 animate-spin mr-3" />
          <span className="text-white/70">Calculating differences...</span>
        </div>
      );
    }

    if (!diffSegments.length) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          {leftText && rightText ? (
            <>
              <Check className="h-12 w-12 text-emerald-400 mb-3" />
              <p className="text-lg font-medium text-emerald-400">No differences found!</p>
              <p className="text-white/70">The texts are identical.</p>
            </>
          ) : (
            <>
              <Sparkles className="h-12 w-12 text-violet-400 mb-3" />
              <p className="text-white/90 font-medium">Ready to compare</p>
              <p className="text-white/70">Enter text in both panels to see differences</p>
            </>
          )}
        </div>
      );
    }

    // Render based on view mode
    if (diffViewMode === 'split') {
      const leftSegments = diffSegments.filter(seg => !seg.added);
      const rightSegments = diffSegments.filter(seg => !seg.removed);
      
      return (
        <div className="grid grid-cols-2 gap-4 font-mono text-sm">
          <div className="space-y-1">
            <h4 className="text-white/70 text-xs uppercase tracking-wide mb-2">Original</h4>
            {leftSegments.map((segment, idx) => {
              // Find corresponding segment in right for comparison
              const correspondingRight = rightSegments.find(
                rs => rs.lineNumber === segment.lineNumber || rs.originalLineNumber === segment.originalLineNumber
              );
              
              return (
                <div 
                  key={`left-${idx}`}
                  className={`py-1 px-2 rounded ${
                    segment.removed 
                      ? 'bg-red-500/20 text-red-300 border-l-2 border-red-500' 
                      : 'text-white/90'
                  }`}
                >
                  {diffSettings.showLineNumbers && (
                    <span className="inline-block w-8 text-white/50 text-right mr-3">
                      {segment.originalLineNumber || segment.lineNumber}
                    </span>
                  )}
                  <span className="mr-2">
                    {segment.removed ? '-' : ' '}
                  </span>
                  {renderDiffSegment(segment, true, correspondingRight?.text)}
                </div>
              );
            })}
          </div>
          <div className="space-y-1">
            <h4 className="text-white/70 text-xs uppercase tracking-wide mb-2">Modified</h4>
            {rightSegments.map((segment, idx) => {
              // Find corresponding segment in left for comparison
              const correspondingLeft = leftSegments.find(
                ls => ls.lineNumber === segment.lineNumber || ls.modifiedLineNumber === segment.modifiedLineNumber
              );
              
              return (
                <div 
                  key={`right-${idx}`}
                  className={`py-1 px-2 rounded ${
                    segment.added 
                      ? 'bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-500' 
                      : 'text-white/90'
                  }`}
                >
                  {diffSettings.showLineNumbers && (
                    <span className="inline-block w-8 text-white/50 text-right mr-3">
                      {segment.modifiedLineNumber || segment.lineNumber}
                    </span>
                  )}
                  <span className="mr-2">
                    {segment.added ? '+' : ' '}
                  </span>
                  {renderDiffSegment(segment, false, correspondingLeft?.text)}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Unified view - show all segments in order
    return (
      <div className="font-mono text-sm">
        {diffSegments.map((segment, idx) => (
          <div 
            key={idx} 
            className={`py-1 px-2 rounded transition-colors ${
              segment.added 
                ? 'bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-500' 
                : segment.removed 
                  ? 'bg-red-500/20 text-red-300 border-l-2 border-red-500' 
                  : 'text-white/90 hover:bg-white/5'
            } ${segment.isIntraline ? 'inline-block mr-1 mb-1' : 'block'}`}
          >
            {!segment.isIntraline && diffSettings.showLineNumbers && (
              <span className="inline-block w-8 text-white/50 text-right mr-3">
                {segment.lineNumber}
              </span>
            )}
            <span className="mr-2">
              {segment.added ? '+' : segment.removed ? '-' : ' '}
            </span>
            {renderDiffSegment(segment)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 p-6">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={leftFileInputRef}
        onChange={(e) => handleFileUpload('left', e)}
        accept=".txt,.md,.json,.html,.css,.js,.ts,.jsx,.tsx,.xml,.yaml,.yml,.log"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={rightFileInputRef}
        onChange={(e) => handleFileUpload('right', e)}
        accept=".txt,.md,.json,.html,.css,.js,.ts,.jsx,.tsx,.xml,.yaml,.yml,.log"
        style={{ display: 'none' }}
      />

      {/* Header */}
      <GlassCard className="mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-violet-500 rounded-xl">
              <Split className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Text Diff Checker</h1>
              <p className="text-white/70">Compare texts with intelligent highlighting</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowStats(!showStats)}
              variant={showStats ? 'primary' : 'ghost'}
            >
              <BarChart2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'success' : 'danger'}
              aria-pressed={autoRefresh}
            >
              <Play className="h-4 w-4 mr-2" />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            {!autoRefresh && (
              <Button onClick={manualRefresh} disabled={isDiffing}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
            <Button onClick={swapTexts} disabled={isDiffing}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Swap
            </Button>
            <Button onClick={exportResults} disabled={!diffSegments.length}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={clearAll} disabled={isDiffing}>
              <Trash className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex flex-wrap gap-2">
          {viewModes.map(mode => (
            <Button
              key={mode.id}
              onClick={() => setDiffViewMode(mode.id)}
              variant={diffViewMode === mode.id ? 'primary' : 'ghost'}
              size="sm"
              aria-pressed={diffViewMode === mode.id}
            >
              {mode.icon}
              <span className="ml-2">{mode.name}</span>
            </Button>
          ))}
        </div>
      </GlassCard>

      {/* Settings Panel */}
      <GlassCard className="mb-6 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <Button 
            onClick={() => updateDiffSetting('ignoreWhitespace', !diffSettings.ignoreWhitespace)}
            variant={diffSettings.ignoreWhitespace ? 'primary' : 'ghost'}
            size="sm"
            aria-pressed={diffSettings.ignoreWhitespace}
          >
            Ignore Whitespace
          </Button>
          <Button 
            onClick={() => updateDiffSetting('ignoreCase', !diffSettings.ignoreCase)}
            variant={diffSettings.ignoreCase ? 'primary' : 'ghost'}
            size="sm"
            aria-pressed={diffSettings.ignoreCase}
          >
            Ignore Case
          </Button>
          <Button 
            onClick={() => updateDiffSetting('highlightIntralineChanges', !diffSettings.highlightIntralineChanges)}
            variant={diffSettings.highlightIntralineChanges ? 'primary' : 'ghost'}
            size="sm"
            aria-pressed={diffSettings.highlightIntralineChanges}
          >
            Intraline Changes
          </Button>
          <Button 
            onClick={() => updateDiffSetting('showLineNumbers', !diffSettings.showLineNumbers)}
            variant={diffSettings.showLineNumbers ? 'primary' : 'ghost'}
            size="sm"
            aria-pressed={diffSettings.showLineNumbers}
          >
            Line Numbers
          </Button>
          <Button onClick={resetSettings} variant="ghost" size="sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>

        {/* Highlight Mode Selector */}
        <div className="flex flex-wrap gap-2">
          <span className="text-white/70 text-sm mr-2 self-center">Highlight Level:</span>
          {(['character', 'word', 'line'] as const).map((mode) => (
            <Button
              key={mode}
              onClick={() => setHighlightMode(mode)}
              variant={highlightMode === mode ? 'primary' : 'ghost'}
              size="sm"
              aria-pressed={highlightMode === mode}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </GlassCard>

      {/* Statistics */}
      {showStats && diffStats && (
        <GlassCard className="mb-6 p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Additions" value={diffStats.additions} color="bg-emerald-500" />
            <StatCard label="Deletions" value={diffStats.deletions} color="bg-red-500" />
            <StatCard label="Changes" value={diffStats.changes} color="bg-amber-500" />
            <StatCard label="Unchanged" value={diffStats.unchanged} color="bg-blue-500" />
            <StatCard label="Change Rate" value={`${diffStats.changePercentage}%`} color="bg-violet-500" />
          </div>
        </GlassCard>
      )}

      {/* Performance Warning */}
      {performanceWarning && (
        <GlassCard className="mb-6 p-4 border-amber-500/50 bg-amber-500/10">
          <div className="flex items-center text-amber-200">
            <AlertTriangle className="h-5 w-5 mr-3" />
            <span>Large text detected. Performance may be affected.</span>
          </div>
        </GlassCard>
      )}

      {/* Text Input Panels */}
      <div className="grid md:grid-cols-2 gap-6 mb-6 h-96">
        <TextArea
          value={leftText}
          onChange={setLeftText}
          placeholder="Paste your original text here..."
          label="Original Text"
          disabled={isDiffing}
          onFileUpload={() => triggerFileUpload('left')}
          onCopy={() => copyToClipboard(leftText)}
          onClear={() => setLeftText('')}
        />
      
        <TextArea
          value={rightText}
          onChange={setRightText}
          placeholder="Paste your modified text here..."
          label="Modified Text"
          disabled={isDiffing}
          onFileUpload={() => triggerFileUpload('right')}
          onCopy={() => copyToClipboard(rightText)}
          onClear={() => setRightText('')}
        />
      </div>

      {/* Diff Results */}
      <GlassCard className="p-6 min-h-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <BarChart2 className="w-5 h-5 mr-2 text-violet-400" />
            Diff Results
          </h3>
          {diffSegments.length > 0 && (
            <div className="text-sm text-white/70">
              {diffSegments.length} {diffSettings.highlightIntralineChanges ? 'changes' : 'lines'}
            </div>
          )}
        </div>

        <div className="bg-black/20 rounded-xl p-4 min-h-64 max-h-96 overflow-auto">
          {renderDiffContent()}
        </div>
      </GlassCard>

      {/* Components */}
      {notification && <Notification notification={notification} />}

      {/* Styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.8);
        }
      `}</style>
    </div>
  );
};

export default TextDiffChecker;