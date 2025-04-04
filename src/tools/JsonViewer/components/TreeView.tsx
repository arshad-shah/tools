/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, JSX } from 'react';
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/Badge";
import DataNode from './DataNode';

interface TreeViewProps {
  data: any;
  searchTerm: string;
}

const TreeView: React.FC<TreeViewProps> = React.memo(({ data, searchTerm }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [matchedPaths, setMatchedPaths] = useState<Set<string>>(new Set());
  const [collapsedCount, setCollapsedCount] = useState<number>(0);
  const [totalNodesCount, setTotalNodesCount] = useState<number>(0);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Calculate total nodes and update matched paths when search term changes
  useEffect(() => {
    let count = 0;
    
    const searchRegex = searchTerm ? new RegExp(searchTerm, 'i') : null;
    const matches = new Set<string>();

    const searchNode = (obj: any, path: string[] = []): void => {
      count++;
      const currentPath = path.join('.');
      
      // Check if current node matches
      if (searchRegex) {
        let isMatch = false;
        
        // Check value
        if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
          if (String(obj).match(searchRegex)) {
            isMatch = true;
          }
        }
        
        // Check node key
        const nodeName = path[path.length - 1];
        if (nodeName && String(nodeName).match(searchRegex)) {
          isMatch = true;
        }
        
        if (isMatch) {
          matches.add(currentPath);
          // Add all parent paths to keep them expanded
          path.forEach((_, index) => {
            matches.add(path.slice(0, index + 1).join('.'));
          });
        }
      }
      
      // Recurse through object/array
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          searchNode(value, [...path, key]);
        });
      }
    };

    searchNode(data, ['root']);
    setTotalNodesCount(count);
    setMatchedPaths(matches);
    
    // Auto-expand matched nodes
    if (searchTerm) {
      setExpandedNodes(new Set(matches));
    }
  }, [searchTerm, data]);

  // Calculate collapsed nodes count
  useEffect(() => {
    const visibleCount = [...expandedNodes].reduce((count, path) => {
      // Count children of expanded nodes
      let childCount = 0;
      const parts = path.split('.');
      let currentObj = data;
      
      for (let i = 1; i < parts.length; i++) {
        if (!currentObj || typeof currentObj !== 'object') {
          break;
        }
        currentObj = currentObj[parts[i]];
      }
      
      if (currentObj && typeof currentObj === 'object') {
        childCount = Object.keys(currentObj).length;
      }
      
      return count + childCount;
    }, 0);
    
    setCollapsedCount(Math.max(0, totalNodesCount - visibleCount));
  }, [expandedNodes, totalNodesCount, data]);

  // Copy functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const renderNode = (
    nodeData: any, 
    nodePath: string[] = ['root'], 
    depth: number = 0
  ): JSX.Element => {
    const currentPath = nodePath.join('.');
    const isExpanded = expandedNodes.has(currentPath);
    const isMatched = matchedPaths.has(currentPath);
    const nodeName = nodePath[nodePath.length - 1];

    const handleToggle = (): void => {
      const newExpanded = new Set(expandedNodes);
      if (newExpanded.has(currentPath)) {
        newExpanded.delete(currentPath);
      } else {
        newExpanded.add(currentPath);
      }
      setExpandedNodes(newExpanded);
    };

    const handleCopyPath = () => {
      copyToClipboard(currentPath);
    };

    const handleCopyValue = () => {
      try {
        const value = typeof nodeData === 'object' && nodeData !== null 
          ? JSON.stringify(nodeData, null, 2) 
          : String(nodeData);
        copyToClipboard(value);
      } catch{
        copyToClipboard(String(nodeData));
      }
    };

    return (
      <div 
        key={currentPath}
        onMouseEnter={() => setHoveredPath(currentPath)}
        onMouseLeave={() => setHoveredPath(null)}
      >
        <DataNode
          name={nodeName}
          data={nodeData}
          depth={depth}
          onToggle={handleToggle}
          isExpanded={isExpanded}
          isMatched={isMatched}
          onCopyPath={handleCopyPath}
          onCopyValue={handleCopyValue}
        />
        
        {isExpanded && nodeData && typeof nodeData === 'object' && (
          <div className={cn(
            hoveredPath === currentPath && "bg-cyan-50/30 rounded-lg"
          )}>
            {Object.entries(nodeData).map(([key, value]) => 
              renderNode(value, [...nodePath, key], depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Tree statistics bar */}
      <div className="flex items-center justify-between text-xs text-cyan-700 bg-cyan-50/50 p-2 rounded-lg mb-2">
        <div className="flex items-center gap-2">
          {matchedPaths.size > 0 && searchTerm && (
            <Badge className="bg-cyan-100 hover:bg-cyan-200 text-cyan-800 border-none">
              {matchedPaths.size} match{matchedPaths.size !== 1 ? 'es' : ''}
            </Badge>
          )}
          <span>
            {totalNodesCount} total node{totalNodesCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex gap-2">
          {collapsedCount > 0 && (
            <span className="text-cyan-600">{collapsedCount} collapsed</span>
          )}
          
          <button 
            onClick={() => setExpandedNodes(new Set(['root']))}
            className="text-cyan-600 hover:text-cyan-800 hover:underline"
          >
            Collapse all
          </button>
          
          <button 
            onClick={() => {
              // Expand all first level nodes
              const newExpanded = new Set(['root']);
              if (data && typeof data === 'object') {
                Object.keys(data).forEach(key => {
                  newExpanded.add(`root.${key}`);
                });
              }
              setExpandedNodes(newExpanded);
            }}
            className="text-cyan-600 hover:text-cyan-800 hover:underline"
          >
            Expand level 1
          </button>
        </div>
      </div>
      
      {/* Tree content */}
      <div className="rounded-xl border border-cyan-100 overflow-hidden bg-white">
        {renderNode(data)}
      </div>
    </div>
  );
});

TreeView.displayName = 'TreeView';

export default TreeView;