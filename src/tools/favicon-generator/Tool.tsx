import { useCallback, useMemo, useState } from 'react';
import { useClipboard } from '@/shared/lib/clipboard';
import { saveZip } from '@/shared/lib/download';
import { ToolError } from '@/shared/lib/errors';
import { readText } from '@/shared/lib/files';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { sniffAcceptKind } from '@/shared/lib/sniff';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useJob } from '@/shared/state/useJob';
import {
  Container,
  PaneTabs,
  PrivacyNote,
  Stack,
  usePaneTab,
} from '@/shared/ui';
import { ExportPanel } from './components/ExportPanel';
import { PreviewPanel } from './components/PreviewPanel';
import {
  SourcePanel,
  type SourceMode,
  type SvgState,
} from './components/SourcePanel';
import { buildFavicons, htmlSnippet } from './lib/outputs';
import { validateText, type IconSource } from './lib/render';
import { sanitizeSvg } from './lib/sanitize-svg';
import { faviconSettings } from './settings';

const EMPTY_SVG: SvgState = { text: '', clean: null, removed: [], error: null };

const errorText = (e: unknown, fallback: string) =>
  e instanceof ToolError ? e.message : fallback;

function svgState(text: string): SvgState {
  if (!text.trim()) return EMPTY_SVG;
  try {
    const { svg, removed } = sanitizeSvg(text);
    return { text, clean: svg, removed, error: null };
  } catch (e) {
    return {
      text,
      clean: null,
      removed: [],
      error: errorText(e, 'This is not a valid SVG file'),
    };
  }
}

export default function FaviconGenerator() {
  const [settings, update] = faviconSettings.useSettings();
  const [mode, setMode] = useState<SourceMode>('text');
  const [text, setText] = useState('');
  const [image, setImage] = useState<{
    name: string;
    bitmap: ImageBitmap;
  } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [svg, setSvg] = useState<SvgState>(EMPTY_SVG);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const { copy } = useClipboard();

  const loadImage = useCallback(async (file: File) => {
    setMode('image');
    try {
      const bitmap = await createImageBitmap(file);
      setImage({ name: file.name, bitmap });
      setImageError(null);
    } catch {
      setImage(null);
      setImageError(`${file.name} could not be decoded as an image`);
    }
  }, []);
  const loadSvgFile = useCallback(async (file: File) => {
    setSvg(svgState(await readText(file)));
  }, []);
  // A dropped or handed-off SVG opens the SVG source; anything else is an image.
  const loadFile = useCallback(
    async (file: File) => {
      if ((await sniffAcceptKind(file)) === 'svg') {
        setMode('svg');
        await loadSvgFile(file);
      } else await loadImage(file);
    },
    [loadImage, loadSvgFile],
  );
  useHandoffFiles((files) => {
    if (files[0]) void loadFile(files[0]);
  });
  const tab = usePaneTab('favicon-generator', 'source');

  let textError: string | null = null;
  if (text.trim())
    try {
      validateText(text);
    } catch (e) {
      textError = errorText(e, 'Use 1 to 3 characters for a text icon');
    }

  const { font, fg, bg, shape, padding } = settings;
  const source = useMemo<IconSource | null>(() => {
    if (mode === 'image')
      return image && { kind: 'image', bitmap: image.bitmap };
    if (mode === 'svg')
      return svg.clean ? { kind: 'svg', svg: svg.clean } : null;
    if (!text.trim() || textError) return null;
    return { kind: 'text', text, font, fg, bg, shape, padding };
  }, [mode, image, svg.clean, text, textError, font, fg, bg, shape, padding]);

  const snippet = htmlSnippet({ svg: source?.kind === 'svg' });

  const job = useJob(async (_ctx, src: IconSource) => {
    const files = await buildFavicons(src, {
      name,
      shortName,
      themeColor: settings.themeColor,
      backgroundColor: settings.backgroundColor,
    });
    await saveZip(
      files.map((f) => ({ name: f.name, data: f.bytes })),
      'favicons.zip',
    );
  });
  const runJob = job.run;
  const download = useCallback(async () => {
    if (!source) return;
    await runJob(source);
  }, [source, runJob]);

  const copySnippet = useCallback(() => void copy(snippet), [copy, snippet]);

  useToolCommands('favicon-generator', [
    {
      id: 'zip',
      label: 'Download ZIP',
      run: () => void download(),
      enabled: !!source && job.status !== 'running',
    },
    { id: 'copy', label: 'Copy snippet', run: copySnippet },
  ]);

  return (
    <Container size="full" className="px-0 sm:px-0">
      <Stack gap="4">
        <PaneTabs
          id="favicon-generator"
          label="Favicon panes"
          value={tab.value}
          onValueChange={tab.show}
          panes={[
            {
              id: 'source',
              label: 'Source',
              content: (
                <SourcePanel
                  mode={mode}
                  onModeChange={setMode}
                  imageName={image?.name ?? null}
                  imageError={imageError}
                  onImage={(f) => void loadImage(f)}
                  svg={svg}
                  onSvgText={(t) => setSvg(svgState(t))}
                  text={text}
                  onTextChange={setText}
                  textError={textError}
                  settings={settings}
                  update={update}
                />
              ),
            },
            {
              id: 'preview',
              label: 'Preview',
              changeKey: source,
              content: (
                <PreviewPanel
                  source={source}
                  backgroundColor={settings.backgroundColor}
                  name={name}
                  shortName={shortName}
                />
              ),
            },
          ]}
        />
        <ExportPanel
          name={name}
          onNameChange={setName}
          shortName={shortName}
          onShortNameChange={setShortName}
          themeColor={settings.themeColor}
          backgroundColor={settings.backgroundColor}
          onColours={update}
          snippet={snippet}
          canDownload={!!source}
          downloading={job.status === 'running'}
          error={job.error?.message ?? null}
          onDownload={() => void download()}
        />
        <PrivacyNote variant="local">
          Icons are drawn on this device.
        </PrivacyNote>
      </Stack>
    </Container>
  );
}
