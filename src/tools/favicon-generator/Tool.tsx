import {
  Button,
  Card,
  CodeBlock,
  ColorField,
  Grid,
  Inline,
  Notice,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { download as downloadIcon } from '@arshad-shah/cynosure/icons';
import { useCallback, useMemo, useState } from 'react';
import { copyText } from '@/shared/lib/clipboard';
import { saveZip } from '@/shared/lib/download';
import { ToolError } from '@/shared/lib/errors';
import { readText } from '@/shared/lib/files';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { sniffAcceptKind } from '@/shared/lib/sniff';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useJob } from '@/shared/state/useJob';
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

/**
 * Favicon and App Icon Generator (redesign spec, file tool pattern): the
 * source beside a live preview, then the manifest fields and one button
 * that downloads every icon.
 */
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

  const copySnippet = useCallback(() => void copyText(snippet), [snippet]);

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
    <Stack gap="6">
      <Grid columns={{ base: 1, lg: 2 }} gap="6" align="start">
        <SourcePanel
          mode={mode}
          onModeChange={setMode}
          imageName={image?.name ?? null}
          imageError={imageError}
          onImage={(f) => void loadImage(f)}
          svg={svg}
          onSvgText={(t) => setSvg(svgState(t))}
          onSvgFile={(f) => void loadSvgFile(f)}
          text={text}
          onTextChange={setText}
          textError={textError}
          settings={settings}
          update={update}
        />
        <PreviewPanel
          source={source}
          backgroundColor={settings.backgroundColor}
          name={name}
          shortName={shortName}
        />
      </Grid>
      <Card as="section" title="Manifest and download" headingLevel={2}>
        <Stack gap="5">
          <Grid columns={{ base: 1, md: 2 }} gap="5">
            <TextField
              label="App name"
              placeholder="My app"
              value={name}
              onChange={setName}
            />
            <TextField
              label="Short name"
              placeholder="App"
              value={shortName}
              onChange={setShortName}
            />
            <ColorField
              label="Theme colour"
              format="hex"
              value={settings.themeColor}
              onChange={(themeColor) => update({ themeColor })}
            />
            <ColorField
              label="Manifest background colour"
              format="hex"
              value={settings.backgroundColor}
              onChange={(backgroundColor) => update({ backgroundColor })}
            />
          </Grid>
          {job.error ? (
            <Notice tone="danger">{job.error.message}</Notice>
          ) : null}
          <Inline>
            <Button
              variant="solid"
              tone="accent"
              size="lg"
              icon={downloadIcon}
              disabled={!source}
              loading={job.status === 'running'}
              onClick={() => void download()}
            >
              Download ZIP
            </Button>
          </Inline>
          <CodeBlock
            title="HTML for the page head"
            code={snippet}
            language="html"
            copyable
            labels={{ copy: 'Copy snippet' }}
          />
        </Stack>
      </Card>
    </Stack>
  );
}
