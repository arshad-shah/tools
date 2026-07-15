/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  NodeTypes,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomNode from './CustomNode';
import { AppNode, DataFlowProps } from './types';
import { useDataProcessor } from './useDataProcessor';

const nodeTypes = {
  custom: CustomNode,
} satisfies NodeTypes;

const DataFlow: React.FC<DataFlowProps> = ({ initialData }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const accent = 'var(--color-accent)';
  const surface = 'var(--color-surface)';
  const subtle = 'var(--color-surface-subtle)';
  const muted = 'var(--color-fg-subtle)';

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            style: { stroke: accent, strokeWidth: 2 },
            animated: true,
          },
          eds,
        ),
      ),
    [setEdges, accent],
  );

  useDataProcessor({ initialData, setNodes, setEdges });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 400,
        borderRadius: 8,
        overflow: 'hidden',
        background: subtle,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        snapToGrid={false}
        fitView
        fitViewOptions={{ padding: 0.2, duration: 300 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: accent, strokeWidth: 1.5 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color={muted}
          gap={20}
          size={1}
        />
        <Controls
          position="bottom-right"
          style={{
            background: surface,
            border: `1px solid var(--color-line)`,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default DataFlow;
