/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  NodeTypes,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box } from '@arshad-shah/cynosure-react';

import CustomNode from './CustomNode';
import { AppNode, DataFlowProps } from './types';
import { useDataProcessor } from './useDataProcessor';

const nodeTypes = {
  custom: CustomNode,
} satisfies NodeTypes;

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

const DataFlow: React.FC<DataFlowProps> = ({ initialData }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            style: { stroke: '#60A5FA', strokeWidth: 2 },
            animated: true,
          },
          eds,
        ),
      ),
    [setEdges],
  );

  useDataProcessor({ initialData, setNodes, setEdges });

  return (
    <Box width="full" style={{ height: '70vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        snapToGrid={false}
        defaultViewport={defaultViewport}
        fitView
      >
        <Background
          variant={BackgroundVariant.Cross}
          color="#60A5FA"
          gap={24}
          size={1.5}
        />
        <MiniMap
          nodeStrokeColor={(n) => (n.type === 'custom' ? '#60A5FA' : '#fff')}
          nodeColor={(n) => (n.type === 'custom' ? '#1E293B' : '#fff')}
          maskColor="rgba(0, 0, 0, 0.2)"
        />
        <Controls position="bottom-right" />
      </ReactFlow>
    </Box>
  );
};

export default DataFlow;
