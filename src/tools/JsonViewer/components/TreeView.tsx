/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { JSX, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  Stack,
  Text,
} from '@/components/ui';
import DataNode from './DataNode';

interface TreeViewProps {
  data: any;
  searchTerm: string;
}

const TreeView: React.FC<TreeViewProps> = React.memo(({ data, searchTerm }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['root']),
  );
  const [matchedPaths, setMatchedPaths] = useState<Set<string>>(new Set());
  const [collapsedCount, setCollapsedCount] = useState<number>(0);
  const [totalNodesCount, setTotalNodesCount] = useState<number>(0);

  useEffect(() => {
    let count = 0;
    const searchRegex = searchTerm ? new RegExp(searchTerm, 'i') : null;
    const matches = new Set<string>();

    const searchNode = (obj: any, path: string[] = []): void => {
      count++;
      const currentPath = path.join('.');
      if (searchRegex) {
        let isMatch = false;
        if (
          typeof obj === 'string' ||
          typeof obj === 'number' ||
          typeof obj === 'boolean'
        ) {
          if (String(obj).match(searchRegex)) isMatch = true;
        }
        const nodeName = path[path.length - 1];
        if (nodeName && String(nodeName).match(searchRegex)) isMatch = true;
        if (isMatch) {
          matches.add(currentPath);
          path.forEach((_, idx) => {
            matches.add(path.slice(0, idx + 1).join('.'));
          });
        }
      }
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          searchNode(value, [...path, key]);
        });
      }
    };

    searchNode(data, ['root']);
    setTotalNodesCount(count);
    setMatchedPaths(matches);
    if (searchTerm) setExpandedNodes(new Set(matches));
  }, [searchTerm, data]);

  useEffect(() => {
    const visibleCount = [...expandedNodes].reduce((c, path) => {
      let childCount = 0;
      const parts = path.split('.');
      let currentObj: any = data;
      for (let i = 1; i < parts.length; i++) {
        if (!currentObj || typeof currentObj !== 'object') break;
        currentObj = currentObj[parts[i]];
      }
      if (currentObj && typeof currentObj === 'object') {
        childCount = Object.keys(currentObj).length;
      }
      return c + childCount;
    }, 0);
    setCollapsedCount(Math.max(0, totalNodesCount - visibleCount));
  }, [expandedNodes, totalNodesCount, data]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderNode = (
    nodeData: any,
    nodePath: string[] = ['root'],
    depth = 0,
  ): JSX.Element => {
    const currentPath = nodePath.join('.');
    const isExpanded = expandedNodes.has(currentPath);
    const isMatched = matchedPaths.has(currentPath);
    const nodeName = nodePath[nodePath.length - 1];

    const handleToggle = () => {
      const next = new Set(expandedNodes);
      if (next.has(currentPath)) next.delete(currentPath);
      else next.add(currentPath);
      setExpandedNodes(next);
    };
    const handleCopyPath = () => copyToClipboard(currentPath);
    const handleCopyValue = () => {
      try {
        const value =
          typeof nodeData === 'object' && nodeData !== null
            ? JSON.stringify(nodeData, null, 2)
            : String(nodeData);
        copyToClipboard(value);
      } catch {
        copyToClipboard(String(nodeData));
      }
    };

    return (
      <Box key={currentPath}>
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
        {isExpanded &&
          nodeData &&
          typeof nodeData === 'object' &&
          Object.entries(nodeData).map(([key, value]) =>
            renderNode(value, [...nodePath, key], depth + 1),
          )}
      </Box>
    );
  };

  const expandAllLevelOne = () => {
    const next = new Set(['root']);
    if (data && typeof data === 'object') {
      Object.keys(data).forEach((key) => next.add(`root.${key}`));
    }
    setExpandedNodes(next);
  };

  return (
    <Stack gap="2">
      <Card>
        <CardBody>
          <Inline justify="between" align="center" gap="2" wrap>
            <Inline gap="2" align="center" wrap>
              {searchTerm && matchedPaths.size > 0 && (
                <Badge variant="soft" tone="accent" size="sm">
                  {matchedPaths.size} match
                  {matchedPaths.size !== 1 ? 'es' : ''}
                </Badge>
              )}
              <Text size="sm" tone="subtle">
                {totalNodesCount} total node{totalNodesCount !== 1 ? 's' : ''}
              </Text>
            </Inline>
            <Inline gap="2" align="center" wrap>
              {collapsedCount > 0 && (
                <Text size="sm" tone="subtle">
                  {collapsedCount} collapsed
                </Text>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedNodes(new Set(['root']))}
              >
                Collapse all
              </Button>
              <Button variant="ghost" size="sm" onClick={expandAllLevelOne}>
                Expand level 1
              </Button>
            </Inline>
          </Inline>
        </CardBody>
      </Card>

      <Card>
        <CardBody>{renderNode(data)}</CardBody>
      </Card>
    </Stack>
  );
});

TreeView.displayName = 'TreeView';

export default TreeView;
