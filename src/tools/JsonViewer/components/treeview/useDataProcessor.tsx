import { useEffect } from 'react';
import { Edge } from '@xyflow/react';
import { AppNode } from './types';
import { getLayoutedElements, createEdge } from './layoutManager';

interface UseDataProcessorProps {
  initialData: Record<string, unknown> | unknown[];
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
}

export const useDataProcessor = ({ 
  initialData, 
  setNodes, 
  setEdges 
}: UseDataProcessorProps) => {
  useEffect(() => {
    if (!initialData) return;

    const processedNodes: AppNode[] = [];
    const processedEdges: Edge[] = [];
    let nodeCounter = 1;

    const processNode = (data: unknown, parentId?: string, label?: string): string => {
      const currentId = String(nodeCounter++);
      
      if (typeof data === 'object' && data !== null) {
        const isArray = Array.isArray(data);
        const entries = Object.entries(data);
        
        processedNodes.push({
          id: currentId,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            label: label || (isArray ? 'Array' : 'Object'),
            content: isArray ? `[${entries.length} items]` : `{${entries.length} properties}`,
            type: isArray ? 'array' : 'object',
          },
        });

        if (parentId) {
          processedEdges.push(createEdge(parentId, currentId));
        }

        const primitiveProperties: string[] = [];
        entries.forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            processNode(value, currentId, key);
          } else {
            primitiveProperties.push(`${key}: ${value}`);
          }
        });

        if (primitiveProperties.length > 0) {
          const propId = String(nodeCounter++);
          processedNodes.push({
            id: propId,
            type: 'custom',
            position: { x: 0, y: 0 },
            data: {
              label: 'Properties',
              content: primitiveProperties.join('\n'),
              type: 'primitive',
            },
          });
          
          processedEdges.push(createEdge(currentId, propId));
        }
      }
      return currentId;
    };

    processNode(initialData);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      processedNodes,
      processedEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialData, setNodes, setEdges]);
};