import {
  IconButton,
  Inline,
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

/** History, orientation, crop and zoom above the image. */
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
        <IconButton
          icon={pageRotateCcw}
          label="Rotate left"
          variant="ghost"
          disabled={busy}
          onClick={() => p.onRotate('ccw')}
        />
        <IconButton
          icon={pageRotate}
          label="Rotate right"
          variant="ghost"
          disabled={busy}
          onClick={() => p.onRotate('cw')}
        />
        <IconButton
          icon={swap}
          label="Flip horizontally"
          variant="ghost"
          disabled={busy}
          onClick={() => p.onFlip('h')}
        />
        <IconButton
          icon={swap}
          label="Flip vertically"
          variant="ghost"
          disabled={busy}
          onClick={() => p.onFlip('v')}
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
        onZoomChange={p.onZoom}
        labels={{ fit: 'Zoom to fit' }}
      />
    </Inline>
  );
}
