/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DropZone } from './drop-zone';
import { useWindowFileDrag } from './use-window-file-drag';

const file = (name: string) =>
  new File(['x'], name, { type: 'application/pdf' });
const transfer = (files: File[]) => ({ files, types: ['Files'] });

afterEach(() => vi.restoreAllMocks());

describe('DropZone', () => {
  it('"Choose files" opens the file input', () => {
    const click = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});
    render(<DropZone variant="hero" onFiles={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose files' }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('a drop with two files hands both over', () => {
    const onFiles = vi.fn();
    const { container } = render(
      <DropZone variant="inline" onFiles={onFiles} />,
    );
    const files = [file('a.pdf'), file('b.pdf')];
    fireEvent.drop(container.firstElementChild!, {
      dataTransfer: transfer(files),
    });
    expect(onFiles).toHaveBeenCalledWith(files);
  });

  it('disabled ignores drops', () => {
    const onFiles = vi.fn();
    const { container } = render(
      <DropZone variant="hero" onFiles={onFiles} disabled />,
    );
    fireEvent.drop(container.firstElementChild!, {
      dataTransfer: transfer([file('a.pdf')]),
    });
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Choose files' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('picking files through the input hands them over', () => {
    const onFiles = vi.fn();
    const { container } = render(
      <DropZone variant="inline" onFiles={onFiles} />,
    );
    const input = container.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [file('a.pdf')] } });
    expect(onFiles).toHaveBeenCalledTimes(1);
  });
});

function Fullscreen({ onFiles }: { onFiles: (f: File[]) => void }) {
  const { dragging } = useWindowFileDrag(onFiles);
  return <DropZone variant="fullscreen" active={dragging} onFiles={onFiles} />;
}

const dragEvent = (
  type: string,
  files: File[] = [],
  relatedTarget: EventTarget | null = document.body,
) => {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    dataTransfer: unknown;
    relatedTarget: unknown;
  };
  Object.defineProperty(e, 'dataTransfer', { value: transfer(files) });
  Object.defineProperty(e, 'relatedTarget', { value: relatedTarget });
  return e;
};

const windowDrag = (
  type: string,
  files: File[] = [],
  relatedTarget: EventTarget | null = document.body,
) => {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    dataTransfer: unknown;
    relatedTarget: unknown;
  };
  Object.defineProperty(e, 'dataTransfer', { value: transfer(files) });
  Object.defineProperty(e, 'relatedTarget', { value: relatedTarget });
  act(() => {
    window.dispatchEvent(e);
  });
};

describe('inline DropZone drag state', () => {
  it('moving over a child does not drop the highlight', () => {
    const { container } = render(
      <DropZone variant="hero" onFiles={() => {}} />,
    );
    const zone = container.firstElementChild as HTMLElement;
    fireEvent.dragOver(zone, { dataTransfer: transfer([]) });
    expect(zone.getAttribute('data-dragging')).toBe('true');
    const child = zone.querySelector('button')!;
    act(() => {
      zone.dispatchEvent(dragEvent('dragleave', [], child));
    });
    expect(zone.getAttribute('data-dragging')).toBe('true');
    act(() => {
      zone.dispatchEvent(dragEvent('dragleave', [], document.body));
    });
    expect(zone.getAttribute('data-dragging')).toBeNull();
  });

  it('carries no aria-disabled on the generic container', () => {
    const { container } = render(
      <DropZone variant="hero" onFiles={() => {}} disabled />,
    );
    expect(container.firstElementChild!.hasAttribute('aria-disabled')).toBe(
      false,
    );
  });
});

describe('fullscreen DropZone', () => {
  it('appears on window dragenter with files and hides on drop', () => {
    const onFiles = vi.fn();
    render(<Fullscreen onFiles={onFiles} />);
    expect(screen.queryByTestId('drop-zone-fullscreen')).toBeNull();
    windowDrag('dragenter');
    expect(screen.getByTestId('drop-zone-fullscreen')).toBeTruthy();
    const files = [file('a.pdf')];
    windowDrag('drop', files);
    expect(screen.queryByTestId('drop-zone-fullscreen')).toBeNull();
    expect(onFiles).toHaveBeenCalledWith(files);
    expect(onFiles).toHaveBeenCalledTimes(1);
  });

  it('a drop on the overlay itself is delivered exactly once', () => {
    const onFiles = vi.fn();
    render(<Fullscreen onFiles={onFiles} />);
    windowDrag('dragenter');
    const overlay = screen.getByTestId('drop-zone-fullscreen');
    act(() => {
      overlay.dispatchEvent(dragEvent('drop', [file('a.pdf')]));
    });
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('drop-zone-fullscreen')).toBeNull();
  });

  it('a drop an inline DropZone handled is not delivered again by the window', () => {
    const onWindow = vi.fn();
    const onInline = vi.fn();
    function Both() {
      useWindowFileDrag(onWindow);
      return <DropZone variant="inline" onFiles={onInline} />;
    }
    const { container } = render(<Both />);
    act(() => {
      container.firstElementChild!.dispatchEvent(
        dragEvent('drop', [file('a.pdf')]),
      );
    });
    expect(onInline).toHaveBeenCalledTimes(1);
    expect(onWindow).not.toHaveBeenCalled();
  });

  it('hides when the drag leaves the window', () => {
    render(<Fullscreen onFiles={() => {}} />);
    windowDrag('dragenter');
    windowDrag('dragleave', [], null);
    expect(screen.queryByTestId('drop-zone-fullscreen')).toBeNull();
  });
});
