import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from '@/shared/lib/theme';
import { cn } from '@/shared/lib/cn';
import { FLOW_EDGE_STYLE } from './flow-style';

/**
 * xyflow's Controls on theme tokens. "!" and the CSS variables override
 * xyflow's own unlayered stylesheet.
 */
const CONTROLS_CLASS = [
  'rounded-lg! border! border-line! bg-surface! shadow-e2!',
  '[--xy-controls-button-background-color:var(--color-surface)]',
  '[--xy-controls-button-background-color-hover:var(--color-surface-3)]',
  '[--xy-controls-button-color:var(--color-fg-muted)]',
  '[--xy-controls-button-color-hover:var(--color-fg)]',
  '[--xy-controls-button-border-color:var(--color-line)]',
].join(' ');

export type FlowCanvasProps<N extends Node, E extends Edge> = ReactFlowProps<
  N,
  E
> & {
  /** Accessible name of the diagram region. */
  label: string;
  className?: string;
};

/** React Flow diagram on theme tokens: colour mode, background, controls. */
export function FlowCanvas<N extends Node = Node, E extends Edge = Edge>({
  label,
  className,
  children,
  defaultEdgeOptions,
  ...props
}: FlowCanvasProps<N, E>) {
  const { resolved } = useTheme();
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        'h-full min-h-[400px] w-full overflow-hidden rounded-lg bg-surface-2',
        className,
      )}
    >
      <ReactFlow<N, E>
        colorMode={resolved}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: FLOW_EDGE_STYLE,
          ...defaultEdgeOptions,
        }}
        {...props}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="var(--color-line-strong)"
          gap={20}
          size={1}
        />
        <Controls position="bottom-right" className={CONTROLS_CLASS} />
        {children}
      </ReactFlow>
    </div>
  );
}
FlowCanvas.displayName = 'FlowCanvas';
