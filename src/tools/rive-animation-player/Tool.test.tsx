/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRive } from './test/fake-rive';
import RiveAnimationPlayer from './Tool';

vi.mock('@rive-app/react-canvas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@rive-app/react-canvas')>()),
  Rive: (await import('./test/fake-rive')).FakeRive,
}));
vi.mock('@/shared/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const riv = () =>
  new File([new Uint8Array([0x52, 0x49, 0x56, 0x45, 1])], 'a.riv');

async function renderAndLoad() {
  const view = render(<RiveAnimationPlayer />);
  const input = view.container.querySelector(
    'input[type=file]',
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [riv()] } });
  await waitFor(() => expect(FakeRive.instances).toHaveLength(1));
  return { ...view, rive: FakeRive.instances[0] };
}

beforeEach(() => {
  FakeRive.instances.length = 0;
  FakeRive.artboards = ['Main'];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('RiveAnimationPlayer', () => {
  it('shows the error banner after a failed load, with no stray "0"', async () => {
    const { rive } = await renderAndLoad();
    act(() => rive.params.onLoadError?.());

    expect(screen.getByText('Error loading animation')).toBeTruthy();
    expect(
      screen.getByText("The uploaded file doesn't contain any animations."),
    ).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('hides the artboard picker for a single-artboard file', async () => {
    const { rive } = await renderAndLoad();
    act(() => rive.finishLoad());
    expect(screen.queryByText('Artboard')).toBeNull();
    expect(screen.getByText('Artboards: 1')).toBeTruthy();
  });

  it('offers and counts every artboard of a multi-artboard file', async () => {
    FakeRive.artboards = ['Main', 'Alt'];
    const { rive } = await renderAndLoad();
    act(() => rive.finishLoad());
    expect(screen.getByText('Artboard')).toBeTruthy();
    expect(screen.getByText('Artboards: 2')).toBeTruthy();
  });
});
