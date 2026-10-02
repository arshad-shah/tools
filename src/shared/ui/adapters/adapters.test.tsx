/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { resetThemeForTests, writeThemePreference } from '@/shared/lib/theme';

const received: Record<string, unknown> = {};

vi.mock('react-plotly.js', () => ({
  default: (props: Record<string, unknown>) => {
    received.plot = props;
    return <div data-testid="plot" />;
  },
}));
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

const { Chart } = await import('./Chart');
const { FlowCanvas } = await import('./FlowCanvas');
const { CodeEditor } = await import('./CodeEditor');
const { QrCode } = await import('./QrCode');
const { RivePlayer } = await import('./RivePlayer');

beforeEach(() => {
  document.documentElement.style.setProperty('--surface', '#123456');
  document.documentElement.style.setProperty('--fg', '#abcdef');
  document.documentElement.style.setProperty('--accent-fg', '#0b794f');
});
afterEach(() => {
  resetThemeForTests();
  localStorage.clear();
});

describe('kit adapters', () => {
  it('Chart is a labelled region painted from tokens', () => {
    render(
      <Chart
        label="Plot of f(x)"
        data={[{ type: 'scatter', x: [1], y: [2] }]}
      />,
    );
    expect(screen.getByRole('img', { name: 'Plot of f(x)' })).toBeTruthy();
    const props = received.plot as {
      layout: { paper_bgcolor: string; font: { color: string } };
      data: { line: { color: string } }[];
      config: { displaylogo: boolean };
    };
    expect(props.layout.paper_bgcolor).toBe('#123456');
    expect(props.layout.font.color).toBe('#abcdef');
    expect(props.data[0].line.color).toBe('#0b794f');
    expect(props.config.displaylogo).toBe(false);
  });
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
