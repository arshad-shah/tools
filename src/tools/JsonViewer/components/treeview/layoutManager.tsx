import dagre from 'dagre';
import { Edge } from '@xyflow/react';
import { AppNode, ProcessedElements } from './types';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 60;

export const getLayoutedElements = (nodes: AppNode[], edges: Edge[]): ProcessedElements => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 30 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - NODE_WIDTH / 2,
          y: nodeWithPosition.y - NODE_HEIGHT / 2,
        },
      };
    }),
    edges,
  };
};

export const createEdge = (source: string, target: string): Edge => ({
  id: `${source}->${target}`,
  source,
  target,
  type: 'smoothstep',
  style: { stroke: '#60A5FA', strokeWidth: 2 },
  animated: true,
});