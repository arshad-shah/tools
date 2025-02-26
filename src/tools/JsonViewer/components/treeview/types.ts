import { Node, Edge, BuiltInNode } from '@xyflow/react';

export type NodeType = 'object' | 'array' | 'primitive';

export interface NodeData {
  label: string;
  content?: string;
  type: NodeType;
  [key: string]: unknown;
}

export type MainNode = Node<NodeData, "custom">;
export type AppNode = BuiltInNode | MainNode;

export interface ProcessedElements {
  nodes: AppNode[];
  edges: Edge[];
}

export interface DataFlowProps {
  initialData: Record<string, unknown> | unknown[];
}