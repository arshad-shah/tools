import {
  Card,
  DeviceFrame,
  Inline,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { SandboxedHtml } from '@/shared/surfaces/sandboxed-html/SandboxedHtml';
import type { PreviewCanvas, PreviewDevice } from '../settings';

export interface PreviewPanelProps {
  css: string;
  html: string;
  device: PreviewDevice;
  canvas: PreviewCanvas;
  onDevice(device: PreviewDevice): void;
  onCanvas(canvas: PreviewCanvas): void;
  /** Shown when an optimised stylesheet is ready to compare. */
  optimisedAvailable: boolean;
  useOptimised: boolean;
  onUseOptimised(on: boolean): void;
  note?: string;
}

/**
 * The page's canvas as the browser would draw it (system colours, so no
 * literal colours), placed before the user's CSS so it can override it.
 */
const canvasCss = (canvas: PreviewCanvas) =>
  `html{color-scheme:${canvas};background:Canvas;color:CanvasText}`;

const DEVICES: { value: PreviewDevice; label: string }[] = [
  { value: 'fill', label: 'Full width' },
  { value: 'phone', label: 'Phone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'browser', label: 'Desktop' },
];

/**
 * The stylesheet applied to the markup in the sandboxed frame (no
 * scripts, no network). Device frames give the frame a real width, so
 * media queries answer as they would on that device.
 */
export function PreviewPanel(p: PreviewPanelProps) {
  const frame = (
    <SandboxedHtml
      html={p.html}
      baseCss={`${canvasCss(p.canvas)}\n${p.css}`}
      title="Rendered CSS"
      size={p.device === 'fill' ? 'page' : 'fill'}
    />
  );
  return (
    <Card as="section" title="Preview" headingLevel={2} padding="sm">
      <Stack gap="3">
        <Inline gap="3" align="center" justify="between" wrap>
          <SegmentedControl
            size="sm"
            label="Viewport"
            value={p.device}
            onChange={(v) => p.onDevice(v as PreviewDevice)}
            options={DEVICES}
          />
          <SegmentedControl
            size="sm"
            label="Page colours"
            value={p.canvas}
            onChange={(v) => p.onCanvas(v as PreviewCanvas)}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Inline>
        {p.optimisedAvailable ? (
          <Switch
            size="sm"
            label="Preview the optimised CSS"
            checked={p.useOptimised}
            onChange={p.onUseOptimised}
          />
        ) : null}
        {p.device === 'fill' ? (
          frame
        ) : (
          <DeviceFrame
            device={p.device}
            label={`${p.device} preview`}
            url="preview"
          >
            {frame}
          </DeviceFrame>
        )}
        {p.note ? (
          <Text size="sm" tone="muted">
            {p.note}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
