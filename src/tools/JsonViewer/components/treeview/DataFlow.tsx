/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react';
import { 
  ReactFlow, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  MiniMap, 
  Controls,
  Background,
  NodeTypes,
  BackgroundVariant,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { DataFlowProps, AppNode } from './types';
import CustomNode from './CustomNode';
import { useDataProcessor } from './useDataProcessor';
import { FlowStyles } from './styles';

const nodeTypes = {
  custom: CustomNode,
} satisfies NodeTypes;

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

const DataFlow: React.FC<DataFlowProps> = ({ initialData }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const onConnect = useCallback(
      (params: any) => setEdges((eds) => addEdge(
        { 
          ...params, 
          type: 'smoothstep',
          style: { stroke: '#60A5FA', strokeWidth: 2 },
          animated: true
        }, 
        eds
      )),
      []
    );

  useDataProcessor({ initialData, setNodes, setEdges });

  return (
    <div className={FlowStyles.container}>
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
        className="backdrop-blur-sm"
      >
        <Background 
        variant={BackgroundVariant.Cross}
          color="#60A5FA"
          gap={24}
          size={1.5}
          className={FlowStyles.background}
        />
        <MiniMap
          className={FlowStyles.minimap}
          nodeStrokeColor={(n) => n.type === 'custom' ? '#60A5FA' : '#fff'}
          nodeColor={(n) => n.type === 'custom' ? '#1E293B' : '#fff'}
          maskColor="rgba(0, 0, 0, 0.2)"
        />
        <Controls 
          className={FlowStyles.controls}
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
};

export default DataFlow;