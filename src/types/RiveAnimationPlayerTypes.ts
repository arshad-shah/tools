import { StateMachineInput } from '@rive-app/react-canvas';

/**
 * Information about the loaded Rive file
 */
export interface RiveInfo {
  /** Rive file version */
  version: string;
  /** Size of the file in bytes */
  fileSize: number;
  /** Frames per second of the animation */
  fps: string | number;
}

/**
 * Debug log entry with timestamp and type
 */
export interface DebugLog {
  /** Unique identifier for the log entry */
  id: string;
  /** Timestamp when the log was created */
  timestamp: string;
  /** Log message content */
  message: string;
  /** Type/severity of the log */
  type: 'info' | 'error' | 'warning' | 'success';
}

/**
 * Props for the RiveAnimationPlayer component
 */
export interface RiveAnimationPlayerProps {
  /** Primary color in Tailwind CSS format (e.g., 'bg-sky-500') */
  primaryColor?: string;
  /** Secondary color in Tailwind CSS format (e.g., 'bg-sky-600') */
  secondaryColor?: string;
  /** Initial artboard to display, if not provided will use the first available */
  initialArtboard?: string;
  /** Initial animation to play, if not provided will use the first available */
  initialAnimation?: string;
  /** Initial state machine to activate, if not provided will use the first available */
  initialStateMachine?: string;
  /** Whether to show the debug panel by default */
  showDebugPanel?: boolean;
  /** Whether to autoplay the animation when loaded */
  autoplay?: boolean;
  /** Canvas width (optional, defaults to 100%) */
  width?: number | string;
  /** Canvas height (optional, defaults to 420px) */
  height?: number | string;
  /** Callback fired when the Rive file is loaded successfully */
  onRiveLoad?: (artboards: string[], animations: string[], stateMachines: string[]) => void;
  /** Callback fired when there's an error loading the Rive file */
  onRiveError?: (error: Error) => void;
  /** Callback fired when an artboard is selected */
  onArtboardChange?: (artboard: string) => void;
  /** Callback fired when an animation is selected */
  onAnimationChange?: (animation: string) => void;
  /** Callback fired when a state machine is selected */
  onStateMachineChange?: (stateMachine: string) => void;
  /** Callback fired when a state machine input changes */
  onInputChange?: (input: StateMachineInput, value: boolean | number) => void;
}

/**
 * Rive animation file format version
 */
export enum RiveVersion {
  /** Legacy version 6 */
  V6 = 'v6',
  /** Current version 7 */
  V7 = 'v7',
  /** Latest development version */
  LATEST = 'latest'
}

/**
 * Animation fit options
 */
export enum RiveFit {
  /** Scale to fill the container, may crop the animation */
  FILL = 'fill',
  /** Scale to fit the container, may have empty space */
  CONTAIN = 'contain',
  /** Scale to cover the container, maintains aspect ratio */
  COVER = 'cover',
  /** Fit horizontally, may crop vertically */
  FIT_WIDTH = 'fitWidth',
  /** Fit vertically, may crop horizontally */
  FIT_HEIGHT = 'fitHeight',
  /** Don't scale, use the animation's original size */
  NONE = 'none'
}

/**
 * Animation alignment options
 */
export enum RiveAlignment {
  /** Center the animation */
  CENTER = 'center',
  /** Align to the top left */
  TOP_LEFT = 'topLeft',
  /** Align to the top center */
  TOP_CENTER = 'topCenter',
  /** Align to the top right */
  TOP_RIGHT = 'topRight',
  /** Align to the center left */
  CENTER_LEFT = 'centerLeft',
  /** Align to the center right */
  CENTER_RIGHT = 'centerRight',
  /** Align to the bottom left */
  BOTTOM_LEFT = 'bottomLeft',
  /** Align to the bottom center */
  BOTTOM_CENTER = 'bottomCenter',
  /** Align to the bottom right */
  BOTTOM_RIGHT = 'bottomRight'
}

/**
 * State machine input types
 */
export enum RiveInputType {
  /** Boolean input (true/false) */
  BOOLEAN = 'boolean',
  /** Number input (0-100) */
  NUMBER = 'number',
  /** Trigger input (fires an event) */
  TRIGGER = 'trigger'
}

/**
 * Library versions
 */
export const RIVE_LIB_VERSION = '0.8.4';
export const REACT_RIVE_VERSION = '3.0.52';