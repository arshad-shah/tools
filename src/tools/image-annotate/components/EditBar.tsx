import {
  IconButton,
  Inline,
  Menu,
  Toolbar,
  ZoomControls,
  type ZoomSetting,
} from '@arshad-shah/cynosure';
import {
  crop,
  pageRotate,
  pageRotateCcw,
  redo,
  swap,
  undo,
  close,
} from '@arshad-shah/cynosure/icons';

export interface EditBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  onRotate(dir: 'cw' | 'ccw'): void;
  onFlip(axis: 'h' | 'v'): void;
  onCrop(): void;
  onClose(): void;
  cropping: boolean;
  percent: number;
  onZoom(z: ZoomSetting): void;
}

/** History, crop, orientation (one menu) and zoom above the image. */
export function EditBar(p: EditBarProps) {
  const busy = p.cropping;
  return (
    <Inline gap="3" align="center" justify="between" wrap>
      <Toolbar label="Edit image">
        <IconButton
          icon={undo}
          label="Undo"
          variant="ghost"
          disabled={!p.canUndo}
          onClick={p.onUndo}
        />
        <IconButton
          icon={redo}
          label="Redo"
          variant="ghost"
          disabled={!p.canRedo}
          onClick={p.onRedo}
        />
        <Menu
          label="Rotate and flip"
          items={[
            { value: 'ccw', label: 'Rotate left', icon: pageRotateCcw },
            { value: 'cw', label: 'Rotate right', icon: pageRotate },
            { value: 'h', label: 'Flip horizontally', icon: swap },
            { value: 'v', label: 'Flip vertically', icon: swap },
          ]}
          onSelect={(v) =>
            v === 'cw' || v === 'ccw' ? p.onRotate(v) : p.onFlip(v as 'h' | 'v')
          }
          trigger={(props) => (
            <IconButton
              {...props}
              icon={pageRotate}
              label="Rotate and flip"
              variant="ghost"
              disabled={busy}
            />
          )}
        />
        <IconButton
          icon={crop}
          label="Crop"
          variant="ghost"
          disabled={busy}
          onClick={p.onCrop}
        />
        <IconButton
          icon={close}
          label="Close the image"
          variant="ghost"
          onClick={p.onClose}
        />
      </Toolbar>
      <ZoomControls
        percent={p.percent}
        min={5}
        max={800}
        fits={['fit-page']}
        buttons={['fit', 'actual-size']}
        size="md"
        onZoomChange={p.onZoom}
        labels={{ fit: 'Zoom to fit' }}
      />
    </Inline>
  );
}
