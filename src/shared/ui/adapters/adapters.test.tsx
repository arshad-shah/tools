/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { resetThemeForTests, writeThemePreference } from '@/shared/lib/theme';

const received: Record<string, unknown> = {};

vi.mock('@xyflow/react', () => ({
  ReactFlow: (props: Record<string, unknown>) => {
    received.flow = props;
    return <div data-testid="flow">{props.children as React.ReactNode}</div>;
  },
  Background: (props: Record<string, unknown>) => {
    received.background = props;
    return null;
  },
  Controls: () => null,
  BackgroundVariant: { Dots: 'dots' },
}));
vi.mock('@xyflow/react/dist/style.css', () => ({}));
vi.mock('@uiw/react-textarea-code-editor', () => ({
  default: (props: Record<string, unknown>) => {
    received.editor = props;
    return <textarea aria-label={props['aria-label'] as string} />;
  },
}));
vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props: Record<string, unknown>) => {
    received.qr = { ...props, kind: 'svg' };
    return null;
  },
  QRCodeCanvas: (props: Record<string, unknown>) => {
    received.qr = { ...props, kind: 'canvas' };
    return null;
  },
}));

const { FlowCanvas } = await import('./FlowCanvas');
const { CodeEditor } = await import('./CodeEditor');
const { QrCode } = await import('./QrCode');
const { RivePlayer } = await import('./RivePlayer');

afterEach(() => {
  resetThemeForTests();
  localStorage.clear();
});

describe('kit adapters', () => {
  it('FlowCanvas follows the theme colour mode', () => {
    writeThemePreference('dark');
    render(<FlowCanvas label="Data map" nodes={[]} edges={[]} />);
    expect(screen.getByRole('region', { name: 'Data map' })).toBeTruthy();
    expect((received.flow as { colorMode: string }).colorMode).toBe('dark');
    expect((received.background as { color: string }).color).toMatch(
      /var\(--color-/,
    );
  });
  it('CodeEditor is labelled and uses the theme colour mode', () => {
    writeThemePreference('light');
    render(
      <CodeEditor
        label="JSON input"
        language="json"
        value="{}"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'JSON input' })).toBeTruthy();
    expect((received.editor as Record<string, string>)['data-color-mode']).toBe(
      'light',
    );
  });
  it('QrCode renders the chosen format with a name', () => {
    render(
      <QrCode
        value="hi"
        size={128}
        level="M"
        fg="#000000"
        bg="#ffffff"
        label="QR code for hi"
        format="canvas"
      />,
    );
    expect(screen.getByRole('img', { name: 'QR code for hi' })).toBeTruthy();
    expect(received.qr).toMatchObject({
      kind: 'canvas',
      fgColor: '#000000',
      level: 'M',
    });
  });
  it('RivePlayer owns a labelled canvas and forwards its ref', () => {
    const ref = { current: null as HTMLCanvasElement | null };
    render(<RivePlayer ref={ref} label="Animation" background="white" />);
    expect(screen.getByRole('img', { name: 'Animation' })).toBe(ref.current);
  });
});
