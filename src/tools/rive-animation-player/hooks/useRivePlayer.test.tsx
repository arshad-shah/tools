/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  Alignment,
  Fit,
  StateMachineInputType,
  type Layout,
  type StateMachineInput,
} from '@rive-app/react-canvas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notify } from '@/shared/lib/notify';
import { FakeRive } from '../test/fake-rive';
import { PlayerError, PlayerState } from '../types';
import { useRivePlayer } from './useRivePlayer';

vi.mock('@rive-app/react-canvas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@rive-app/react-canvas')>()),
  Rive: (await import('../test/fake-rive')).FakeRive,
}));
vi.mock('@/shared/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const riv = (name = 'a.riv') =>
  new File([new Uint8Array([0x52, 0x49, 0x56, 0x45, 1])], name);

function setup() {
  const hook = renderHook(() => useRivePlayer());
  const canvas = document.createElement('canvas');
  canvas.getContext = (() => null) as never;
  (hook.result.current.canvasRef as { current: HTMLCanvasElement }).current =
    canvas;
  return { ...hook, canvas };
}

const messages = (logs: { message: string }[]) =>
  logs.map((l) => l.message).reverse();

beforeEach(() => {
  FakeRive.instances.length = 0;
  FakeRive.artboards = ['Main'];
});

describe('useRivePlayer', () => {
  it('creates one instance, then fills the lists from its Load event', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));

    expect(FakeRive.instances).toHaveLength(1);
    const rive = FakeRive.instances[0];
    const layout = rive.params.layout;
    expect(layout.fit).toBe(Fit.Cover);
    expect(layout.alignment).toBe(Alignment.Center);
    expect(result.current.status.current).toBe(PlayerState.Active);
    expect(result.current.filename).toBe('a.riv');
    expect(result.current.animationList?.animations).toEqual([]);
    // The runtime has no contents before the file loads.
    expect(result.current.artboards).toEqual([]);
    expect(result.current.riveInfo?.artboardCount).toBe(0);

    act(() => rive.finishLoad());
    expect(result.current.animationList).toEqual({
      animations: ['idle', 'run'],
      active: 'idle',
    });
    expect(result.current.stateMachineList).toEqual({
      stateMachines: ['machine'],
      active: 'machine',
    });
    expect(result.current.artboards).toEqual(['Main']);
    expect(result.current.selectedArtboard).toBe('Main');
    expect(result.current.riveInfo?.artboardCount).toBe(1);
    expect(result.current.status).toEqual({
      current: PlayerState.Active,
      error: null,
    });
    expect(messages(result.current.debugLogs)).toEqual([
      'File selected: a.riv (5 B)',
      'Loading animation from buffer...',
      'Found 0 animations: ',
      'Found 0 state machines: ',
      'Found 2 animations: idle, run',
      'Found 1 state machines: machine',
      'Switching controller to: animations',
      'Rive animation loaded successfully',
    ]);
    expect(rive.play).toHaveBeenLastCalledWith('idle');
  });

  it('reports a runtime that cannot be created and resets with the error', async () => {
    FakeRive.failNext = new Error('wasm missing');
    const { result } = setup();
    await act(() => result.current.load(riv()));

    expect(FakeRive.instances).toHaveLength(0);
    expect(result.current.status).toEqual({
      current: PlayerState.Idle,
      error: PlayerError.NoAnimation,
    });
    expect(result.current.filename).toBeNull();
    expect(notify.error).toHaveBeenCalledWith('Your file has no animations.');
    expect(messages(result.current.debugLogs)).toContain(
      'Error creating Rive instance: wasm missing',
    );
  });

  it('a load error resets the player, sets the error and toasts', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    act(() => FakeRive.instances[0].params.onLoadError?.());

    expect(result.current.status).toEqual({
      current: PlayerState.Idle,
      error: PlayerError.NoAnimation,
    });
    expect(result.current.filename).toBeNull();
    expect(result.current.animationList).toBeNull();
    expect(notify.error).toHaveBeenCalledWith('Your file has no animations.');
    expect(messages(result.current.debugLogs).slice(-2)).toEqual([
      'Failed to load Rive animation',
      'Resetting Rive player',
    ]);
  });

  it('disposes the instance after a load error, outside its own dispatch', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.params.onLoadError?.());
    expect(rive.cleanup).not.toHaveBeenCalled();
    await act(async () => {
      await Promise.resolve();
    });
    expect(rive.cleanup).toHaveBeenCalledTimes(1);

    // The next file gets a fresh instance.
    await act(() => result.current.load(riv('b.riv')));
    expect(FakeRive.instances).toHaveLength(2);
  });

  it('reset stops, then disposes the instance and ignores its later events', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.finishLoad());

    act(() => result.current.reset());
    expect(rive.stop).toHaveBeenCalled();
    expect(rive.cleanup).toHaveBeenCalledTimes(1);
    expect(rive.cleanup.mock.invocationCallOrder[0]).toBeGreaterThan(
      rive.stop.mock.invocationCallOrder.at(-1)!,
    );
    // The synchronous Stop event still lands, as it did before the split.
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.status.current).toBe(PlayerState.Idle);
    expect(result.current.filename).toBeNull();

    act(() => rive.params.onLoad?.());
    act(() => rive.params.onPlay?.());
    expect(result.current.animationList).toBeNull();
    expect(result.current.isPlaying).toBe(false);

    // The next file gets a fresh instance.
    await act(() => result.current.load(riv('b.riv')));
    expect(FakeRive.instances).toHaveLength(2);
  });

  it('disposes the instance on unmount', async () => {
    const { result, unmount } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    unmount();
    expect(rive.cleanup).toHaveBeenCalledTimes(1);
  });

  it('creates no instance when the canvas is gone (file read after unmount)', async () => {
    const { result } = setup();
    (
      result.current.canvasRef as { current: HTMLCanvasElement | null }
    ).current = null;
    await act(() => result.current.load(riv()));
    expect(FakeRive.instances).toHaveLength(0);
  });

  it('uses the layout and size chosen while the file was being read', async () => {
    const { result, canvas } = setup();
    let size = { width: 0, height: 0 };
    const preview = document.createElement('div');
    preview.getBoundingClientRect = () =>
      new DOMRect(0, 0, size.width, size.height);
    (result.current.previewRef as { current: HTMLDivElement }).current =
      preview;

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.load(riv());
    });
    size = { width: 320, height: 180 };
    act(() => {
      window.dispatchEvent(new Event('resize'));
      result.current.setAlignFitIndex({ fit: 1, alignment: 0 });
    });
    await act(() => pending);

    const rive = FakeRive.instances[0];
    const layout = rive.layouts.at(-1) as Layout;
    expect(layout.fit).toBe(Fit.Contain);
    expect(layout.alignment).toBe(Alignment.TopLeft);
    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(180);
  });

  it('a second file reuses the instance and shows Loading until it loads', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.finishLoad());

    await act(() => result.current.load(riv('b.riv')));
    expect(FakeRive.instances).toHaveLength(1);
    expect(rive.load).toHaveBeenCalledWith(
      expect.objectContaining({ autoplay: true }),
    );
    expect(result.current.status.current).toBe(PlayerState.Loading);
    expect(result.current.filename).toBe('b.riv');

    act(() => rive.params.onLoad?.());
    expect(result.current.status.current).toBe(PlayerState.Active);
  });

  it("a second file keeps the user's controller tab", async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.finishLoad());
    act(() => result.current.setControllerState('state-machines'));

    rive.play.mockClear();
    await act(() => result.current.load(riv('b.riv')));
    act(() => rive.params.onLoad?.());
    expect(result.current.controller.active).toBe('state-machines');
    // ...and runs the new file's first state machine on it.
    expect(rive.play).toHaveBeenLastCalledWith('machine');
    expect(rive.stateMachineInputs).toHaveBeenLastCalledWith('machine');
  });

  it('switching state machine stops the old one and lists the new inputs', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.finishLoad());
    const flag = { name: 'flag', type: StateMachineInputType.Boolean };
    rive.stateMachineInputs.mockReturnValue([flag]);

    act(() => result.current.setActiveStateMachine('machine'));
    expect(rive.stop).toHaveBeenCalledWith('machine');
    expect(rive.play).toHaveBeenLastCalledWith('machine');
    expect(result.current.stateMachineInputs).toEqual([flag]);
    expect(messages(result.current.debugLogs).slice(-2)).toEqual([
      'Setting active state machine: machine',
      'Found 1 inputs for state machine: machine',
    ]);
  });

  it('writes boolean, number and trigger inputs to the runtime', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    act(() => FakeRive.instances[0].finishLoad());
    const flag = {
      name: 'flag',
      type: StateMachineInputType.Boolean,
      value: false,
    };
    const speed = {
      name: 'speed',
      type: StateMachineInputType.Number,
      value: 0,
    };
    const fire = vi.fn();
    const jump = { name: 'jump', type: StateMachineInputType.Trigger, fire };
    const odd = { name: 'odd', type: 99 };
    const as = (x: object) => x as unknown as StateMachineInput;

    act(() => result.current.handleInputChange(as(flag), true));
    act(() => result.current.handleInputChange(as(speed), 3));
    act(() => result.current.handleInputChange(as(jump), true));
    act(() => result.current.handleInputChange(as(odd), 1));
    expect(flag.value).toBe(true);
    expect(speed.value).toBe(3);
    expect(result.current.numberValues).toEqual({ speed: 3 });
    expect(fire).toHaveBeenCalledTimes(1);
    expect(result.current.debugLogs[0]).toMatchObject({
      message: 'Unsupported input type: 99',
      type: 'warning',
    });
  });

  it('reports an input the runtime rejects', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const broken = {
      name: 'speed',
      type: StateMachineInputType.Number,
      set value(_v: number) {
        throw new Error('detached');
      },
    } as unknown as StateMachineInput;

    act(() => result.current.handleInputChange(broken, 1));
    expect(notify.error).toHaveBeenCalledWith(
      'Failed to update input: detached',
    );
    expect(result.current.debugLogs[0]).toMatchObject({
      message: 'Error setting input speed: detached',
      type: 'error',
    });
  });

  it('ignores input changes with no instance', () => {
    const { result } = setup();
    const speed = {
      name: 'speed',
      type: StateMachineInputType.Number,
      value: 0,
    } as unknown as StateMachineInput;
    act(() => result.current.handleInputChange(speed, 1));
    expect(result.current.numberValues).toEqual({});
    expect(result.current.debugLogs).toEqual([]);
  });

  it("lists the file's artboards and switches the instance to the chosen one", async () => {
    FakeRive.artboards = ['Main', 'Alt'];
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.finishLoad());
    expect(result.current.artboards).toEqual(['Main', 'Alt']);
    expect(result.current.selectedArtboard).toBe('Main');
    expect(result.current.riveInfo?.artboardCount).toBe(2);

    act(() => result.current.selectArtboard('Alt'));
    expect(rive.reset).toHaveBeenCalledWith({
      artboard: 'Alt',
      autoplay: true,
    });
    expect(result.current.selectedArtboard).toBe('Alt');
    expect(result.current.animationList).toEqual({
      animations: ['Alt-a'],
      active: 'Alt-a',
    });
    expect(result.current.stateMachineList).toEqual({
      stateMachines: ['Alt-sm'],
      active: 'Alt-sm',
    });
  });

  it('starts the first state machine of a new artboard on the state-machines tab', async () => {
    FakeRive.artboards = ['Main', 'Alt'];
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.finishLoad());
    act(() => result.current.setControllerState('state-machines'));

    rive.stop.mockClear();
    act(() => result.current.selectArtboard('Alt'));
    // The autoplayed first animation is stopped before the machine runs.
    expect(rive.stop).toHaveBeenCalledWith();
    expect(rive.stop.mock.invocationCallOrder[0]).toBeLessThan(
      rive.play.mock.invocationCallOrder.at(-1)!,
    );
    expect(rive.play).toHaveBeenLastCalledWith('Alt-sm');
    expect(rive.stateMachineInputs).toHaveBeenLastCalledWith('Alt-sm');
  });

  it('reports an artboard the runtime cannot switch to and keeps the old one', async () => {
    FakeRive.artboards = ['Main', 'Alt'];
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.finishLoad());
    rive.reset.mockImplementationOnce(() => {
      throw new Error('Invalid artboard name or no default artboard');
    });

    act(() => result.current.selectArtboard('Alt'));
    expect(notify.error).toHaveBeenCalledWith(
      "Couldn't switch to artboard Alt: Invalid artboard name or no default artboard",
    );
    expect(result.current.selectedArtboard).toBe('Main');
    expect(result.current.animationList?.active).toBe('idle');
  });

  it('clears input values on reset and when the state machine changes', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    act(() => FakeRive.instances[0].finishLoad());
    const speed = {
      name: 'speed',
      type: StateMachineInputType.Number,
      value: 0,
    } as unknown as StateMachineInput;

    act(() => result.current.handleInputChange(speed, 5));
    act(() => result.current.setBooleanValues({ on: true }));
    expect(result.current.numberValues).toEqual({ speed: 5 });
    act(() => result.current.setActiveStateMachine('machine'));
    expect(result.current.numberValues).toEqual({});
    expect(result.current.booleanValues).toEqual({});

    act(() => result.current.handleInputChange(speed, 7));
    act(() => result.current.setBooleanValues({ on: true }));
    act(() => result.current.reset());
    expect(result.current.numberValues).toEqual({});
    expect(result.current.booleanValues).toEqual({});
  });

  it('clears input values when a second file loads', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.finishLoad());
    act(() => result.current.setBooleanValues({ on: true }));

    await act(() => result.current.load(riv('b.riv')));
    act(() => rive.params.onLoad?.());
    expect(result.current.booleanValues).toEqual({});
  });

  it('applies fit and alignment changes to the live instance', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => result.current.setAlignFitIndex({ fit: 1, alignment: 0 }));
    await waitFor(() => expect(rive.layouts).toHaveLength(2));
    const last = rive.layouts[1] as Layout;
    expect(last.fit).toBe(Fit.Contain);
    expect(last.alignment).toBe(Alignment.TopLeft);
  });

  it('play / pause / stop events drive isPlaying', async () => {
    const { result } = setup();
    await act(() => result.current.load(riv()));
    const rive = FakeRive.instances[0];
    act(() => rive.params.onPause?.());
    expect(result.current.isPlaying).toBe(false);
    act(() => rive.params.onPlay?.());
    expect(result.current.isPlaying).toBe(true);
    act(() => rive.params.onStop?.());
    expect(result.current.isPlaying).toBe(false);
  });
});
