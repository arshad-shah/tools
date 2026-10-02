import {
  IconFileCode,
  IconFilePlus,
  IconFileText,
  IconImages,
} from '@/shared/ui/icons';
import {
  Button,
  FilePicker,
  InspectorSection,
  Label,
  NumberInput,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from '@/shared/ui';
import type { ImageFormat } from '@/pdf/render';
import { MAX_EXPORT_DPI, MIN_EXPORT_DPI } from '@/pdf/render';
import type { PageSizeName } from '@/pdf/edit/images';
import type { ModeProps } from '../types';
import {
  clampDpi,
  IMAGE_ACCEPT,
  selectedPages,
  useConvertActions,
} from './actions';
import { useConvertSettings } from './settings';

/** Convert settings and actions; the document changes only on "Insert images". */
export function ConvertPanel(ctx: ModeProps) {
  const act = useConvertActions(ctx);
  const s = useConvertSettings();
  const set = useConvertSettings.setState;
  const picked = selectedPages(ctx).length;

  return (
    <div className="flex flex-col">
      <InspectorSection title="Pages">
        <Stack gap="2">
          <SegmentedControl
            label="Pages to convert"
            size="sm"
            value={s.scope}
            onChange={(scope) => set({ scope })}
            options={[
              { value: 'all', label: 'All pages' },
              { value: 'selected', label: 'Selected' },
            ]}
          />
          <Text size="sm" tone="muted">
            {s.scope === 'all'
              ? `All ${ctx.doc.view.pages.length} pages, with every pending change.`
              : `${picked} ${picked === 1 ? 'page' : 'pages'} (the selection, or the current page).`}
          </Text>
        </Stack>
      </InspectorSection>
      <InspectorSection title="Images">
        <Stack gap="3">
          <SegmentedControl
            label="Image format"
            size="sm"
            value={s.format}
            onChange={(format: ImageFormat) => set({ format })}
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'jpeg', label: 'JPEG' },
            ]}
          />
          <Stack gap="1">
            <Label htmlFor="convert-dpi">Resolution (DPI)</Label>
            <NumberInput
              id="convert-dpi"
              value={s.dpi}
              min={MIN_EXPORT_DPI}
              max={MAX_EXPORT_DPI}
              onValueChange={(n) =>
                Number.isFinite(n) && set({ dpi: clampDpi(n) })
              }
            />
            <Text size="xs" tone="muted">
              {MIN_EXPORT_DPI} to {MAX_EXPORT_DPI} DPI. Very large pages are
              rendered at a lower resolution to fit in memory; you are told
              when.
            </Text>
          </Stack>
          {s.format === 'jpeg' ? (
            <Stack gap="1">
              <Label htmlFor="convert-quality">
                JPEG quality {Math.round(s.quality * 100)}
              </Label>
              <Slider
                id="convert-quality"
                value={s.quality}
                min={0.5}
                max={1}
                step={0.05}
                onValueChange={(quality) => set({ quality })}
              />
            </Stack>
          ) : null}
          <Button leftIcon={<IconImages />} onClick={() => void act.images()}>
            Pages to images
          </Button>
        </Stack>
      </InspectorSection>
      <InspectorSection title="Text and Markdown">
        <Stack gap="2">
          <Button leftIcon={<IconFileText />} onClick={() => void act.text()}>
            Save as text
          </Button>
          <Button
            leftIcon={<IconFileCode />}
            onClick={() => void act.markdown()}
          >
            Save as Markdown
          </Button>
          <Text size="xs" tone="muted">
            Markdown is a best-effort structural conversion: headings,
            paragraphs and lists are guessed from the layout, and tables come
            out as plain paragraphs. Check the result before use.
          </Text>
        </Stack>
      </InspectorSection>
      <InspectorSection title="Insert images">
        <Stack gap="2">
          <SegmentedControl
            label="Page size for images"
            size="sm"
            value={s.pageSize}
            onChange={(pageSize: PageSizeName) => set({ pageSize })}
            options={[
              { value: 'fit', label: 'Fit image' },
              { value: 'a4', label: 'A4' },
              { value: 'letter', label: 'Letter' },
            ]}
          />
          <FilePicker
            onFiles={(files) => void act.insertImages(files)}
            accept={IMAGE_ACCEPT}
            multiple
          >
            {(pick) => (
              <Button leftIcon={<IconFilePlus />} onClick={pick}>
                Insert images as pages
              </Button>
            )}
          </FilePicker>
          <Text size="xs" tone="muted">
            PNG, JPEG, WebP or GIF, one page each, after the current page.
          </Text>
        </Stack>
      </InspectorSection>
    </div>
  );
}
