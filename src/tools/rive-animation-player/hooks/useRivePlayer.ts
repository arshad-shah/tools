import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Layout, Rive, StateMachineInput } from '@rive-app/react-canvas';
import { toToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';
import { useJob } from '@/shared/state/useJob';
import {
  DEFAULT_ALIGN_FIT,
  getAlignmentValue,
  getFitValue,
} from '../lib/layout';
import { disposeRive } from '../lib/dispose';
import { assertRiveFile } from '../lib/rive-file';
import { configureSameOriginRuntime } from '../lib/runtime';
import {
  PlayerError,
  PlayerState,
  type AlignFitIndex,
  type LoadedRive,
  type RiveAnimations,
  type RiveController,
  type RiveInfo,
  type RiveStateMachines,
  type Status,
} from '../types';
import { useCanvasSize } from './useCanvasSize';
import { useDebugLog } from './useDebugLog';
import { useDropZone } from './useDropZone';
import { useInputValues } from './useInputValues';

configureSameOriginRuntime();

export function useRivePlayer(initialAlignFit = DEFAULT_ALIGN_FIT) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  // The Rive instance is imperative and never rendered, so it lives in a ref
  // (assigning its `layout` is then not a state mutation).
  const riveRef = useRef<Rive | null>(null);

  const [status, setStatus] = useState<Status>({
    current: PlayerState.Idle,
    hovering: false,
  });
  const [filename, setFilename] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [riveInfo, setRiveInfo] = useState<RiveInfo | null>(null);
  const [animationList, setAnimationList] = useState<RiveAnimations | null>(
    null,
  );
  const [stateMachineList, setStateMachineList] =
    useState<RiveStateMachines | null>(null);
  const [stateMachineInputs, setStateMachineInputs] = useState<
    StateMachineInput[]
  >([]);
  const [artboards, setArtboards] = useState<string[]>([]);
  const [selectedArtboard, setSelectedArtboard] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [controller, setController] = useState<RiveController>({
    active: 'animations',
  });
  // Read by the Load handler, which is bound once per instance and would
  // otherwise see the controller of the render that created the instance.
  const controllerRef = useRef(controller);
  const [alignFitIndex, setAlignFitIndex] =
    useState<AlignFitIndex>(initialAlignFit);
  const [loaded, setLoaded] = useState<LoadedRive | null>(null);
  const markLoaded = (rive: Rive) =>
    setLoaded((l) => ({ rive, revision: (l?.revision ?? 0) + 1 }));
  const { debugLogs, addDebugLog, clearDebugLogs } = useDebugLog();
  const {
    numberValues,
    booleanValues,
    setBooleanValues,
    handleInputChange,
    resetInputValues,
  } = useInputValues(riveRef, addDebugLog);
  const dimensions = useCanvasSize(previewRef, canvasRef, riveRef);
  // The latest size and layout, for an instance created after an await (the
  // sync effects skip while there is no instance).
  const latestRef = useRef({ dimensions, alignFitIndex });
  useLayoutEffect(() => {
    latestRef.current = { dimensions, alignFitIndex };
  }, [dimensions, alignFitIndex]);
  useEffect(() => () => disposeRive(riveRef), []);

  const getAnimationList = () => {
    const animations = riveRef.current?.animationNames;
    if (!animations) return;
    setAnimationList({ animations, active: animations[0] });
    addDebugLog(
      `Found ${animations.length} animations: ${animations.join(', ')}`,
      'info',
    );
    return animations;
  };

  const getStateMachineList = () => {
    const stateMachines = riveRef.current?.stateMachineNames;
    if (!stateMachines) return;
    setStateMachineList({ stateMachines, active: stateMachines[0] });
    addDebugLog(
      `Found ${stateMachines.length} state machines: ${stateMachines.join(', ')}`,
      'info',
    );
    return stateMachines;
  };

  const getArtboardList = () => {
    const rive = riveRef.current;
    // `contents` is undefined until the file has loaded.
    const names = rive?.contents?.artboards?.map((a) => a.name) ?? [];
    setArtboards(names);
    setSelectedArtboard(rive?.activeArtboard || names[0] || '');
    const artboardCount = names.length;
    // Functional update: the Load handler is bound once per instance, so a
    // captured riveInfo could be stale.
    setRiveInfo((info) => (info ? { ...info, artboardCount } : info));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    riveRef.current?.stop();
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  // `deferDispose`: called from inside the instance's own event dispatch.
  const resetPlayer = (nextStatus: Status, deferDispose = false) => {
    addDebugLog('Resetting Rive player', 'info');
    setIsPlaying(true);
    setFilename(null);
    setFileSize(null);
    setAnimationList(null);
    setStateMachineList(null);
    setStateMachineInputs([]);
    setArtboards([]);
    setSelectedArtboard('');
    setRiveInfo(null);
    setLoaded(null);
    resetInputValues();
    setStatus(nextStatus);
    // Stop while the instance is still current: its Stop event updates
    // isPlaying, as it did when the instance was dropped after this render.
    clearCanvas();
    disposeRive(riveRef, deferDispose);
  };
  const reset = () => resetPlayer({ ...status, current: PlayerState.Idle });

  // A file that fails to load resets the player and shows the error banner.
  const failLoad = (deferDispose = false) => {
    resetPlayer(
      { current: PlayerState.Idle, error: PlayerError.NoAnimation },
      deferDispose,
    );
    notify.error('Your file has no animations.');
  };

  const setActiveAnimation = (animation: string) => {
    const rive = riveRef.current;
    if (!rive || !animationList) return;
    addDebugLog(`Setting active animation: ${animation}`, 'info');
    clearCanvas();
    rive.stop(animationList.active);
    setAnimationList({ ...animationList, active: animation });
    rive.play(animation);
  };

  const setActiveStateMachine = (stateMachine: string) => {
    const rive = riveRef.current;
    if (!rive || !stateMachineList) return;
    addDebugLog(`Setting active state machine: ${stateMachine}`, 'info');
    clearCanvas();
    rive.stop(stateMachineList.active);
    setStateMachineList({ ...stateMachineList, active: stateMachine });
    playStateMachine(rive, stateMachine);
  };

  const playStateMachine = (rive: Rive, stateMachine: string) => {
    rive.play(stateMachine);
    resetInputValues();
    const inputs = rive.stateMachineInputs(stateMachine);
    setStateMachineInputs(inputs ?? []);
    if (inputs && inputs.length > 0) {
      addDebugLog(
        `Found ${inputs.length} inputs for state machine: ${stateMachine}`,
        'info',
      );
    }
  };

  const setControllerState = (state: 'animations' | 'state-machines') => {
    addDebugLog(`Switching controller to: ${state}`, 'info');
    controllerRef.current = { ...controllerRef.current, active: state };
    setController(controllerRef.current);
    if (state === 'animations' && animationList) {
      setActiveAnimation(animationList.active);
    } else if (state === 'state-machines' && stateMachineList) {
      setActiveStateMachine(stateMachineList.active);
    }
  };

  // Start the current tab's first item from freshly read lists: the Load
  // handler is bound once per instance, so its list state would be stale.
  const startController = (
    rive: Rive,
    animations: string[] | undefined,
    stateMachines: string[] | undefined,
  ) => {
    setStateMachineInputs([]);
    resetInputValues();
    if (controllerRef.current.active === 'animations') {
      if (animations?.[0]) rive.play(animations[0]);
    } else if (stateMachines?.[0]) {
      rive.stop(); // the runtime autoplays the first animation
      playStateMachine(rive, stateMachines[0]);
    }
  };

  const handleLoad = () => {
    const animations = getAnimationList();
    const stateMachines = getStateMachineList();
    getArtboardList();
    setStatus({ current: PlayerState.Active, error: null });
    addDebugLog(`Switching controller to: ${controllerRef.current.active}`);
    const rive = riveRef.current;
    if (rive) startController(rive, animations, stateMachines);
    if (rive) markLoaded(rive);
    addDebugLog('Rive animation loaded successfully', 'success');
  };

  const handleLoadError = () => {
    addDebugLog('Failed to load Rive animation', 'error');
    failLoad(true);
  };

  const selectArtboard = (artboard: string) => {
    const rive = riveRef.current;
    if (!rive || artboard === selectedArtboard) return;
    addDebugLog(`Switching artboard to: ${artboard}`, 'info');
    try {
      rive.reset({ artboard, autoplay: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      addDebugLog(`Error switching artboard: ${msg}`, 'error');
      notify.error(`Couldn't switch to artboard ${artboard}: ${msg}`);
      return;
    }
    setSelectedArtboard(artboard);
    startController(rive, getAnimationList(), getStateMachineList());
    markLoaded(rive);
  };

  /** False when the canvas is gone (the player unmounted during a read). */
  const createInstance = (buffer: ArrayBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const { dimensions, alignFitIndex } = latestRef.current;
    // Handlers are bound before the runtime can fire anything, and ignore an
    // instance the player has since dropped (reset).
    const live = (fn: () => void) => () => {
      if (riveRef.current === instance) fn();
    };
    const instance: Rive = new Rive({
      buffer,
      canvas,
      autoplay: true,
      layout: new Layout({
        fit: getFitValue(alignFitIndex),
        alignment: getAlignmentValue(alignFitIndex),
      }),
      onLoad: live(handleLoad),
      onLoadError: live(handleLoadError),
      onPlay: live(() => setIsPlaying(true)),
      onPause: live(() => setIsPlaying(false)),
      onStop: live(() => setIsPlaying(false)),
    });
    riveRef.current = instance;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    instance.resizeToCanvas();
    return true;
  };

  const setAnimationWithBuffer = (buffer: string | ArrayBuffer | null) => {
    if (!buffer) return;
    setStatus({ current: PlayerState.Loading });
    addDebugLog('Loading animation from buffer...', 'info');
    if (riveRef.current) {
      riveRef.current.load({ buffer: buffer as ArrayBuffer, autoplay: true });
      return;
    }
    try {
      if (!createInstance(buffer as ArrayBuffer)) return;
      setStatus({ current: PlayerState.Active });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      addDebugLog(`Error creating Rive instance: ${msg}`, 'error');
      failLoad();
      return;
    }
    // Read the lists as soon as the instance exists, as before; they are
    // empty until the Load event refills them.
    getAnimationList();
    getStateMachineList();
    getArtboardList();
  };

  useEffect(() => {
    const rive = riveRef.current;
    if (rive) {
      rive.layout = new Layout({
        fit: getFitValue(alignFitIndex),
        alignment: getAlignmentValue(alignFitIndex),
      });
    }
  }, [alignFitIndex]);

  const togglePlayback = () => {
    const active = animationList?.active;
    const rive = riveRef.current;
    if (active && rive) {
      if (!isPlaying) {
        rive.play(active);
        addDebugLog(`Playing animation: ${active}`, 'info');
      } else {
        rive.pause(active);
        addDebugLog(`Paused animation: ${active}`, 'info');
      }
    }
  };

  const loadJob = useJob(async (_ctx, file: File) => {
    try {
      const bytes = await readBytes(file);
      assertRiveFile(file.name, bytes);
      return bytes;
    } catch (e) {
      const error = toToolError(e, `Couldn't read ${file.name}`);
      notify.error(error);
      addDebugLog(error.message, 'error');
      throw error;
    }
  });
  const load = async (file: File) => {
    const sz = formatBytes(file.size);
    addDebugLog(`File selected: ${file.name} (${sz})`, 'info');
    const bytes = await loadJob.run(file);
    if (!bytes) return; // already reported by the job
    setFilename(file.name);
    setFileSize(sz);
    // Queued before the buffer is handed over so the artboard update made
    // when a new instance is created applies on top of it.
    setRiveInfo({ fileSize: file.size, artboardCount: 0 });
    // readBytes returns a view over a whole, fresh ArrayBuffer.
    setAnimationWithBuffer(bytes.buffer as ArrayBuffer);
  };

  const dropZone = useDropZone(status, setStatus, load);

  return {
    canvasRef,
    previewRef,
    status,
    filename,
    fileSize,
    riveInfo,
    animationList,
    stateMachineList,
    stateMachineInputs,
    artboards,
    selectedArtboard,
    selectArtboard,
    isPlaying,
    controller,
    loaded,
    alignFitIndex,
    setAlignFitIndex,
    numberValues,
    booleanValues,
    setBooleanValues,
    debugLogs,
    clearDebugLogs,
    reset,
    setControllerState,
    setActiveAnimation,
    setActiveStateMachine,
    togglePlayback,
    load,
    handleInputChange,
    ...dropZone,
  };
}
