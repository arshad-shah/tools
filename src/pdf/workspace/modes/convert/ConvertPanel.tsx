import {
  Button,
  NumberField,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  fileCode,
  filePlus,
  fileText,
  images,
} from '@arshad-shah/cynosure/icons';
import { FilePicker } from '../../ui/FilePicker';
import { InspectorSection } from '../../ui/InspectorSection';
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
    <>
      <InspectorSection title="Pages">
        <Stack gap="2">
          <SegmentedControl
            label="Pages to convert"
            size="sm"
            fullWidth
            value={s.scope}
            onChange={(scope) => set({ scope: scope as typeof s.scope })}
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
        <Stack gap="4">
          <SegmentedControl
            label="Image format"
            size="sm"
            fullWidth
            value={s.format}
            onChange={(format) => set({ format: format as ImageFormat })}
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'jpeg', label: 'JPEG' },
            ]}
          />
          <NumberField
            label="Resolution (DPI)"
            size="sm"
            value={s.dpi}
            min={MIN_EXPORT_DPI}
            max={MAX_EXPORT_DPI}
            description={`${MIN_EXPORT_DPI} to ${MAX_EXPORT_DPI} DPI. Very large pages are rendered at a lower resolution to fit in memory; you are told when.`}
            onChange={(n) =>
              n !== null && Number.isFinite(n) && set({ dpi: clampDpi(n) })
            }
          />
          {s.format === 'jpeg' ? (
            <Slider
              label="JPEG quality"
              size="sm"
              value={s.quality}
              min={0.5}
              max={1}
              step={0.05}
              showValue
              labels={{ value: (v: number) => `${Math.round(v * 100)}` }}
              onChange={(quality) =>
                typeof quality === 'number' && set({ quality })
              }
            />
          ) : null}
          <Button
            variant="outline"
            fullWidth
            icon={images}
            onClick={() => void act.images()}
          >
            Pages to images
          </Button>
        </Stack>
      </InspectorSection>
      <InspectorSection title="Text and Markdown">
        <Stack gap="2">
          <Button
            variant="outline"
            fullWidth
            icon={fileText}
            onClick={() => void act.text()}
          >
            Save as text
          </Button>
          <Button
            variant="outline"
            fullWidth
            icon={fileCode}
            onClick={() => void act.markdown()}
          >
            Save as Markdown
          </Button>
          <Text size="sm" tone="muted">
            Markdown is a best-effort structural conversion: headings,
            paragraphs and lists are guessed from the layout, and tables come
            out as plain paragraphs. Check the result before use.
          </Text>
        </Stack>
      </InspectorSection>
      <InspectorSection title="Insert images">
        <Stack gap="3">
          <SegmentedControl
            label="Page size for images"
            size="sm"
            fullWidth
            value={s.pageSize}
            onChange={(pageSize) => set({ pageSize: pageSize as PageSizeName })}
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
              <Button
                variant="outline"
                fullWidth
                icon={filePlus}
                onClick={pick}
              >
                Insert images as pages
              </Button>
            )}
          </FilePicker>
          <Text size="sm" tone="muted">
            PNG, JPEG, WebP or GIF, one page each, after the current page.
          </Text>
        </Stack>
      </InspectorSection>
    </>
  );
}
