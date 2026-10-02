/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react';
import {
  addEdge,
  Edge,
  NodeTypes,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { FlowCanvas } from '@/shared/ui/adapters/FlowCanvas';
import { FLOW_EDGE_STYLE } from '@/shared/ui/adapters/flow-style';

import { CustomNode } from './CustomNode';
import { AppNode, DataFlowProps } from './types';
import { useDataProcessor } from './useDataProcessor';

const nodeTypes = {
  custom: CustomNode,
} satisfies NodeTypes;

export const DataFlow: React.FC<DataFlowProps> = ({ initialData }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            style: { ...FLOW_EDGE_STYLE, strokeWidth: 2 },
            animated: true,
          },
          eds,
        ),
      ),
    [setEdges],
  );

  useDataProcessor({ initialData, setNodes, setEdges });

  return (
    <FlowCanvas<AppNode, Edge>
      label="Data map"
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      snapToGrid={false}
      fitView
      fitViewOptions={{ padding: 0.2, duration: 300 }}
    />
  );
};
