export enum PlayerState {
  Idle,
  Loading,
  Active,
}

export enum PlayerError {
  NoAnimation,
}

export type BackgroundColor = 'transparent' | 'white' | 'black';
export type AlignFitIndex = { alignment: number; fit: number };
export type Dimensions = { width: number; height: number };
export type Status = {
  current: PlayerState;
  hovering?: boolean;
  error?: PlayerError | null;
};
export type RiveAnimations = { animations: string[]; active: string };
export type RiveStateMachines = { stateMachines: string[]; active: string };
export type RiveController = { active: 'animations' | 'state-machines' };
/** What the runtime reports about the loaded file (artboards from `contents`). */
export type RiveInfo = {
  fileSize: number;
  artboardCount: number;
};
export type DebugLog = {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'warning' | 'success';
};
