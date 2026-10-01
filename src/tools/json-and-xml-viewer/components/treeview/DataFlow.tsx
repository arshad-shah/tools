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

/** Theme colours handed to xyflow as props (edges, background dots). */
const FLOW_COLORS = {
  accent: 'var(--color-accent)',
  muted: 'var(--color-fg-subtle)',
} as const;

const nodeTypes = {
  custom: CustomNode,
} satisfies NodeTypes;

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
            style: { stroke: FLOW_COLORS.accent, strokeWidth: 2 },
            animated: true,
          },
          eds,
        ),
      ),
    [setEdges],
  );

  useDataProcessor({ initialData, setNodes, setEdges });

  return (
    <div className="h-full min-h-[400px] w-full overflow-hidden rounded-lg bg-surface-subtle">
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
          style: { stroke: FLOW_COLORS.accent, strokeWidth: 1.5 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color={FLOW_COLORS.muted}
          gap={20}
          size={1}
        />
        <Controls
          position="bottom-right"
          className="rounded-lg! border! border-line! bg-surface! shadow-[0_4px_12px_rgba(0,0,0,0.4)]!"
        />
      </ReactFlow>
    </div>
  );
};

export default DataFlow;
