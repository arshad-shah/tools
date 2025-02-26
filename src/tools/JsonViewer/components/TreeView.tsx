/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, JSX } from 'react';
import DataNode from './DataNode';

interface TreeViewProps {
  data: any; // Could be made more specific based on expected data structure
  searchTerm: string;
}

const TreeView: React.FC<TreeViewProps> = React.memo(({ data, searchTerm }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [matchedPaths, setMatchedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!searchTerm) {
      setMatchedPaths(new Set());
      return;
    }

    const searchRegex = new RegExp(searchTerm, 'i');
    const matches = new Set<string>();

    const searchNode = (obj: any, path: string[] = []): void => {
      const currentPath = path.join('.');
      
      // Check if current node matches
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        if (String(obj).match(searchRegex)) {
          matches.add(currentPath);
          // Add all parent paths to keep them expanded
          path.forEach((_, index) => {
            matches.add(path.slice(0, index + 1).join('.'));
          });
        }
      }
      
      // Check node key
      const nodeName = path[path.length - 1];
      if (nodeName && String(nodeName).match(searchRegex)) {
        matches.add(currentPath);
        path.forEach((_, index) => {
          matches.add(path.slice(0, index + 1).join('.'));
        });
      }
      
      // Recurse through object/array
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          searchNode(value, [...path, key]);
        });
      }
    };

    searchNode(data, ['root']);
    setMatchedPaths(matches);
    // Auto-expand matched nodes
    setExpandedNodes(new Set(matches));
  }, [searchTerm, data]);

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

    return (
      <div key={currentPath}>
        <DataNode
          name={nodeName}
          data={nodeData}
          depth={depth}
          onToggle={handleToggle}
          isExpanded={isExpanded}
          isMatched={isMatched}
        />
        
        {isExpanded && nodeData && typeof nodeData === 'object' && (
          <div>
            {Object.entries(nodeData).map(([key, value]) => 
              renderNode(value, [...nodePath, key], depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return renderNode(data);
});

TreeView.displayName = 'TreeView';

export default TreeView;