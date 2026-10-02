import { useState } from 'react';

/**
 * View toggles. History, saved and memory panels: opening one closes the
 * other two. Timestamps and the graph toggle on their own.
 */
export function useCalculatorPanels(historyOpenInitially = false) {
  // Read once on mount: open when saved history exists, closed when empty.
  const [showHistory, setShowHistory] = useState<boolean>(historyOpenInitially);
  const [showFavorites, setShowFavorites] = useState<boolean>(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState<boolean>(false);
  const [showTimestamp, setShowTimestamp] = useState<boolean>(false);
  // Graphing (only used in Expression mode)
  const [showGraph, setShowGraph] = useState<boolean>(false);

  const toggleHistory = () => {
    setShowHistory(!showHistory);
    setShowFavorites(false);
    setShowMemoryPanel(false);
  };

  const toggleFavorites = () => {
    setShowFavorites(!showFavorites);
    setShowHistory(false);
    setShowMemoryPanel(false);
  };

  const toggleMemoryPanel = () => {
    setShowMemoryPanel(!showMemoryPanel);
    setShowHistory(false);
    setShowFavorites(false);
  };

  const toggleTimestamps = () => {
    setShowTimestamp(!showTimestamp);
  };

  const toggleGraph = () => {
    setShowGraph(!showGraph);
  };

  return {
    showTimestamp,
    showGraph,
    toggleTimestamps,
    toggleGraph,
    showHistory,
    showFavorites,
    showMemoryPanel,
    toggleHistory,
    toggleFavorites,
    toggleMemoryPanel,
  };
}
