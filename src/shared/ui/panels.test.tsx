/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProgressOverlay } from './progress-overlay';
import { SidePanel } from './side-panel';
import { Inspector, InspectorSection } from './inspector';
import { Drawer } from './drawer';

describe('ProgressOverlay', () => {
  it('shows a determinate progressbar and Cancel calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <ProgressOverlay
        open
        title="Applying changes"
        progress={{ done: 3, total: 10, label: 'Page 3 of 10' }}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'Applying changes' }),
    ).toBeTruthy();
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemax')).toBe('10');
    expect(screen.getByText('Page 3 of 10')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('is indeterminate without progress and has no Cancel without onCancel', () => {
    render(<ProgressOverlay open title="Working" progress={null} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('renders nothing when closed', () => {
    render(<ProgressOverlay open={false} title="Working" progress={null} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('SidePanel', () => {
  it('is a labelled aside with a separator that resizes with arrows, clamped', () => {
    const onResize = vi.fn();
    const { rerender } = render(
      <SidePanel
        side="left"
        label="Pages"
        width={124}
        minWidth={120}
        maxWidth={260}
        onResize={onResize}
      >
        rail
      </SidePanel>,
    );
    expect(screen.getByRole('complementary', { name: 'Pages' })).toBeTruthy();
    const sep = screen.getByRole('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('vertical');
    expect(sep.getAttribute('aria-valuenow')).toBe('124');
    fireEvent.keyDown(sep, { key: 'ArrowLeft' });
    expect(onResize).toHaveBeenLastCalledWith(120);
    rerender(
      <SidePanel
        side="left"
        label="Pages"
        width={200}
        minWidth={120}
        maxWidth={260}
        onResize={onResize}
      >
        rail
      </SidePanel>,
    );
    fireEvent.keyDown(sep, { key: 'ArrowLeft' });
    expect(onResize).toHaveBeenLastCalledWith(192);
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    expect(onResize).toHaveBeenLastCalledWith(208);
  });

  it('on the right side ArrowLeft widens the panel', () => {
    const onResize = vi.fn();
    render(
      <SidePanel side="right" label="Inspector" width={240} onResize={onResize}>
        x
      </SidePanel>,
    );
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' });
    expect(onResize).toHaveBeenLastCalledWith(248);
  });

  it('has no separator without onResize and hides when collapsed', () => {
    const { rerender } = render(
      <SidePanel side="left" label="Pages" width={160}>
        x
      </SidePanel>,
    );
    expect(screen.queryByRole('separator')).toBeNull();
    rerender(
      <SidePanel side="left" label="Pages" width={160} collapsed>
        x
      </SidePanel>,
    );
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});

describe('Inspector', () => {
  it('panel mode is a labelled complementary region with sections', () => {
    render(
      <Inspector title="Properties" mode="panel" open onOpenChange={() => {}}>
        <InspectorSection title="Position">x and y</InspectorSection>
      </Inspector>,
    );
    expect(
      screen.getByRole('complementary', { name: 'Properties' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Position' }),
    ).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Position' })).toBeTruthy();
  });

  it('a section toggles from its heading button', () => {
    render(
      <InspectorSection title="Style" defaultOpen={false}>
        body
      </InspectorSection>,
    );
    const toggle = screen.getByRole('button', { name: 'Style' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('body')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('body')).toBeTruthy();
  });

  it('popover mode renders a labelled dialog next to the anchor', () => {
    function Harness() {
      const anchor = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={anchor} type="button">
            Anchor
          </button>
          <Inspector
            title="Properties"
            mode="popover"
            anchor={anchor}
            open
            onOpenChange={() => {}}
          >
            body
          </Inspector>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('dialog', { name: 'Properties' })).toBeTruthy();
  });

  it('sheet mode is a bottom drawer that closes on Esc', () => {
    const onOpenChange = vi.fn();
    render(
      <Inspector
        title="Properties"
        mode="sheet"
        open
        onOpenChange={onOpenChange}
      >
        body
      </Inspector>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Properties' });
    expect(dialog.getAttribute('data-side')).toBe('bottom');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders nothing when closed', () => {
    render(
      <Inspector
        title="Properties"
        mode="panel"
        open={false}
        onOpenChange={() => {}}
      >
        body
      </Inspector>,
    );
    expect(screen.queryByText('body')).toBeNull();
  });
});

describe('Drawer', () => {
  it('takes a side and exposes it', () => {
    render(
      <Drawer open onOpenChange={() => {}} side="left" title="Pages">
        x
      </Drawer>,
    );
    expect(
      screen.getByRole('dialog', { name: 'Pages' }).getAttribute('data-side'),
    ).toBe('left');
  });
});
