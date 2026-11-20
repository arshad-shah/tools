import {
  Button,
  Card,
  FileDrop,
  Grid,
  GridItem,
  Inline,
  LoadingDots,
  Notice,
  Stack,
} from '@arshad-shah/cynosure';
import { clipboardPaste } from '@arshad-shah/cynosure/icons';
import { useCallback, useId, useState } from 'react';
import { newId } from '@/shared/lib/id';
import { useToolCommands } from '@/shared/lib/tool-commands';
import {
  RasterStage,
  type StageFrame,
} from '@/shared/surfaces/raster-stage/RasterStage';
import { CropPanel } from './components/CropPanel';
import { EditBar } from './components/EditBar';
import { ExportPanel, TOOL_ID } from './components/ExportPanel';
import { ObjectPanel } from './components/ObjectPanel';
import { StylePanel } from './components/StylePanel';
import { ToolPalette } from './components/ToolPalette';
import { useAnnotator } from './hooks/useAnnotator';
import { useImageInput } from './hooks/useImageInput';
import { useStageGestures } from './hooks/useStageGestures';
import { aspectRatio } from './lib/crop';
import { IMAGE_ACCEPT } from './lib/decode';
import {
  addObject,
  cropDoc,
  docSize,
  flipDoc,
  removeObject,
  reorderObject,
  replaceObject,
  rotateDoc,
  type Doc,
} from './lib/doc';
import { placedObject, type ToolId } from './lib/draft';
import { placeLabel } from './lib/tool-labels';
import { exportImage, type ExportFormat } from './lib/export';
import {
  boundsOfObject,
  describeObject,
  isRedact,
  resizeObject,
  restyle,
  type AnnotObject,
} from './lib/model';
import { paintDoc, paintSize, type Ctx2D } from './lib/render';
import { annotateSettings } from './settings';

const KEYS =
  'Arrow keys move the selected object, Shift with arrows moves 10 pixels, Alt with arrows resizes, Delete removes it. Pick objects from the list beside the image.';

/**
 * Image Editor: crop, rotate and flip an image, then mark it up with
 * shapes, text, numbered steps, highlights and redactions that destroy the
 * pixels they cover. Everything happens on this device.
 */
export default function ImageAnnotate() {
  const [settings, update] = annotateSettings.useSettings();
  const a = useAnnotator();
  const [tool, setTool] = useState<ToolId>('arrow');
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  const [view, setView] = useState({ width: 0, height: 0 });
  const [focusFrame, setFocusFrame] = useState(0);
  const textFieldId = useId();
  const paste = useImageInput((f) => {
    setZoom('fit');
    void a.open(f);
  });

  const { doc, image } = a;
  const cropping = !!a.cropDraft;
  const style = { color: settings.color, width: settings.width };
  const size = doc ? paintSize(doc, cropping) : { width: 1, height: 1 };
  const fit = view.width
    ? Math.min(
        1,
        (view.width - 2) / size.width,
        (view.height - 2) / size.height,
      )
    : 1;
  const scale = zoom === 'fit' ? Math.max(0.01, fit) : zoom;
  const onPointer = useStageGestures(
    a,
    tool,
    style,
    scale,
    settings.aspect,
    () =>
      // The text field appears with the selection: focus it once rendered.
      setTimeout(() => document.getElementById(textFieldId)?.focus(), 0),
  );

  const objects = a.objects;
  const cropDraft = a.cropDraft;
  const paint = useCallback(
    (ctx: Ctx2D) => {
      if (image && doc)
        paintDoc(ctx, {
          image: image.bitmap,
          doc,
          objects,
          cropping: cropDraft,
        });
    },
    [image, doc, objects, cropDraft],
  );

  const committed = (id: string) => doc?.objects.find((o) => o.id === id);
  const change = (o: AnnotObject) => doc && a.commit(replaceObject(doc, o));
  const remove = (id: string) => {
    if (!doc) return;
    a.commit(removeObject(doc, id));
    a.select(null);
  };
  const place = () => {
    if (!doc) return;
    const o = placedObject(tool, newId(), style, docSize(doc), a.measure);
    if (!o) return;
    a.commit(addObject(doc, o));
    a.select(o.id);
    setFocusFrame((n) => n + 1);
  };
  const restyleSelected = (
    patch: { color?: string; width?: number },
    live = false,
  ) => {
    const sel = a.selectedId ? committed(a.selectedId) : undefined;
    if (!doc || !sel || isRedact(sel)) return;
    const next = replaceObject(doc, restyle(sel, patch));
    if (live) a.setPreview(next.objects);
    else a.commit(next);
  };

  const ratio = doc
    ? aspectRatio(settings.aspect, a.full ?? docSize(doc))
    : null;
  const sel = a.selected;
  const frame: StageFrame | null = cropDraft
    ? {
        label: 'Crop area',
        box: cropDraft,
        keepAspect: ratio !== null,
        bounded: true,
        onChange: (b) => a.setCropDraft(b),
        onCommit: (b) => a.setCropDraft(b),
      }
    : sel && doc
      ? (() => {
          const b = boundsOfObject(sel);
          const base = committed(sel.id) ?? sel;
          const resized = (box: typeof b) =>
            replaceObject(doc, resizeObject(base, box, a.measure));
          return {
            label: describeObject(objects, sel),
            box: {
              ...b,
              width: Math.max(1, b.width),
              height: Math.max(1, b.height),
            },
            keepAspect: sel.type === 'step' || sel.type === 'text',
            onChange: (box) => a.setPreview(resized(box).objects),
            onCommit: (box) => a.commit(resized(box)),
          };
        })()
      : null;

  const encode = (format: ExportFormat) => {
    if (!image || !doc) throw new Error('No image');
    return exportImage(image.bitmap, doc, format, settings.quality);
  };

  useToolCommands(TOOL_ID, [
    {
      id: 'undo',
      label: 'Undo',
      shortcut: 'Mod+Z',
      enabled: a.canUndo,
      run: a.undo,
    },
    {
      id: 'redo',
      label: 'Redo',
      shortcut: 'Mod+Shift+Z',
      enabled: a.canRedo,
      run: a.redo,
    },
    { id: 'paste', label: 'Paste an image', run: () => void paste() },
    {
      id: 'fit',
      label: 'Zoom to fit',
      enabled: !!doc,
      run: () => setZoom('fit'),
    },
    // The orientation menu and the Add button, reachable from Mod+K too.
    ...(
      [
        ['rotate-left', 'Rotate left', (d: Doc) => rotateDoc(d, 'ccw')],
        ['rotate-right', 'Rotate right', (d: Doc) => rotateDoc(d, 'cw')],
        ['flip-h', 'Flip horizontally', (d: Doc) => flipDoc(d, 'h')],
        ['flip-v', 'Flip vertically', (d: Doc) => flipDoc(d, 'v')],
      ] as const
    ).map(([id, label, fn]) => ({
      id,
      label,
      enabled: !!doc && !cropping,
      run: () => doc && a.commit(fn(doc)),
    })),
    {
      id: 'place',
      label: placeLabel(tool),
      enabled: !!doc && !cropping && tool !== 'select',
      run: place,
    },
  ]);

  if (!image || !doc)
    return (
      <Stack gap="5">
        <FileDrop
          accept={IMAGE_ACCEPT}
          size="lg"
          labels={{
            prompt: 'Drop an image here, or',
            choose: 'Choose an image',
          }}
          hint="PNG, JPEG, WebP or GIF (first frame). Or paste a screenshot with Ctrl+V. Images stay on this device."
          onFiles={(files) => files[0] && void a.open(files[0])}
        />
        <Inline gap="3" align="center" wrap>
          <Button
            variant="soft"
            icon={clipboardPaste}
            onClick={() => void paste()}
          >
            Paste image
          </Button>
          {a.opening ? <LoadingDots label="Opening the image" /> : null}
        </Inline>
        {a.error ? (
          <Notice tone="danger" title="Could not open the image">
            {a.error.message}
          </Notice>
        ) : null}
      </Stack>
    );

  const out = docSize(doc);
  return (
    <Grid columns={{ base: 1, lg: 3 }} gap="6" align="start">
      <GridItem span={{ base: 1, lg: 2 }}>
        <Card as="section" title={image.name} headingLevel={2}>
          <Stack gap="4">
            <EditBar
              canUndo={a.canUndo}
              canRedo={a.canRedo}
              onUndo={a.undo}
              onRedo={a.redo}
              onRotate={(dir) => a.commit(rotateDoc(doc, dir))}
              onFlip={(axis) => a.commit(flipDoc(doc, axis))}
              onCrop={a.startCrop}
              onClose={a.close}
              cropping={cropping}
              percent={Math.round(scale * 100)}
              onZoom={(z) =>
                setZoom(z.kind === 'percent' ? z.value / 100 : 'fit')
              }
            />
            {cropping ? null : (
              <ToolPalette tool={tool} onTool={setTool} onPlace={place} />
            )}
            <RasterStage
              label={`${image.name}, ${out.width} by ${out.height} pixels, ${doc.objects.length} objects${cropping ? ', cropping' : ''}`}
              description={KEYS}
              width={size.width}
              height={size.height}
              scale={scale}
              paint={paint}
              cursor={cropping || tool !== 'select' ? 'crosshair' : 'default'}
              onPointer={onPointer}
              frame={frame}
              onDelete={() => sel && !cropping && remove(sel.id)}
              onViewport={setView}
              focusFrameKey={focusFrame}
              data-testid="annotate-stage"
            />
          </Stack>
        </Card>
      </GridItem>
      <Stack gap="6">
        {cropDraft && a.full ? (
          <Card as="section" title="Crop" headingLevel={2}>
            <CropPanel
              rect={cropDraft}
              image={a.full}
              aspect={settings.aspect}
              onAspect={(aspect) => update({ aspect })}
              onRect={a.setCropDraft}
              onApply={() => {
                a.commit(cropDoc(doc, cropDraft));
                a.setCropDraft(null);
                setZoom('fit');
              }}
              onCancel={() => a.setCropDraft(null)}
            />
          </Card>
        ) : (
          <>
            <Card as="section" title="Style" headingLevel={2}>
              <StylePanel
                color={settings.color}
                width={settings.width}
                onColor={(color) => {
                  update({ color });
                  restyleSelected({ color });
                }}
                onWidth={(width) => {
                  update({ width });
                  restyleSelected({ width }, true);
                }}
                onWidthCommit={(width) => restyleSelected({ width })}
              />
            </Card>
            <Card as="section" title="Objects" headingLevel={2}>
              <ObjectPanel
                objects={objects}
                selected={sel}
                onSelect={a.select}
                onChange={change}
                onDelete={remove}
                onOrder={(id, to) => a.commit(reorderObject(doc, id, to))}
                measure={a.measure}
                textFieldId={textFieldId}
              />
            </Card>
          </>
        )}
        <Card as="section" title="Export" headingLevel={2}>
          <ExportPanel
            format={settings.format}
            quality={settings.quality}
            onFormat={(format) => update({ format })}
            onQuality={(quality) => update({ quality })}
            sourceName={image.name}
            encode={encode}
            disabled={cropping}
          />
        </Card>
      </Stack>
    </Grid>
  );
}
