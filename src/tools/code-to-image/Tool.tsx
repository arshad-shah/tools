import { Card, Grid, Select, Stack, TextField } from '@arshad-shah/cynosure';
import { useMemo, useState } from 'react';
import { TextSourceActions } from '@/app/ui/text-source';
import { TransformLayout } from '@/app/ui/transform';
import { CodeEditor } from '@/shared/editor';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { ToolError, toToolError } from '@/shared/lib/errors';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import type { LanguageId } from '@/shared/lib/syntax/tokenize';
import { useToolCommands } from '@/shared/lib/tool-commands';
import {
  renderCodeImagePng,
  renderCodeImageSvg,
} from '@/shared/surfaces/code-image/render';
import { PreviewPanel } from './components/PreviewPanel';
import { StylePanel } from './components/StylePanel';
import { useCodeImage } from './hooks/useCodeImage';
import { canCopyImages, copyPng } from './lib/clipboard-image';
import { parseLineRanges } from './lib/highlight';
import { CODE_MIMES } from './lib/mimes';
import {
  IMAGE_LANGUAGES,
  imageInput,
  isLanguageId,
  languageForHandoff,
} from './lib/spec';
import { codeImageSettings, readScale } from './settings';

const TOOL_ID = 'code-to-image';
const MAX_BYTES = 512 * 1024;

const SAMPLE = `export async function fetchUser(id: string) {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error('Not found');
  // Only the fields the profile needs.
  const { name, email, joined } = await res.json();
  return { name, email, joined: new Date(joined) };
}`;

const isCodeHandoff = (p: HandoffPayload) =>
  p.kind === 'text' && CODE_MIMES.includes(p.mime);

/**
 * Code to Image: code in, a highlighted picture out (PNG, SVG or the
 * clipboard). Style options persist; the code, title and highlights never.
 */
export default function CodeToImage() {
  const [s, update] = codeImageSettings.useSettings();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [highlightText, setHighlightText] = useState('');
  const language: LanguageId = isLanguageId(s.language) ? s.language : 'js';
  const scale = readScale(s);

  const highlight = useMemo(() => {
    try {
      return { lines: parseLineRanges(highlightText), error: null };
    } catch (e) {
      return {
        lines: new Set<number>(),
        error: toToolError(e, 'Not a line number').message,
      };
    }
  }, [highlightText]);

  const input = useMemo(
    () =>
      code.trim()
        ? imageInput(code, language, s, { title, highlight: highlight.lines })
        : null,
    [code, language, s, title, highlight.lines],
  );
  const { preview, error, busy } = useCodeImage(input, scale);
  const base = deriveFilename(title.trim() || 'code', '', 'png').replace(
    /\.png$/,
    '',
  );

  const run = async (what: string, job: () => Promise<void>) => {
    try {
      await job();
    } catch (e) {
      notify.error(toToolError(e, `Could not ${what}`));
    }
  };
  const png = () => {
    if (!input)
      return Promise.reject(new ToolError('INVALID_INPUT', 'Paste code first'));
    return renderCodeImagePng(input, scale).then((r) => r.blob);
  };
  const downloadPng = () =>
    run('make the PNG', async () => saveBlob(await png(), `${base}.png`));
  const downloadSvg = () =>
    run('make the SVG', async () => {
      if (!input) return;
      const svg = await renderCodeImageSvg(input);
      saveBlob(new Blob([svg], { type: 'image/svg+xml' }), `${base}.svg`);
    });
  const copyImage = () =>
    run('copy the image', async () => {
      await copyPng(png());
      notify.success('Image copied');
    });

  useToolCommands(TOOL_ID, [
    {
      id: 'png',
      label: 'Download PNG',
      shortcut: 'Mod+Shift+D',
      run: () => void downloadPng(),
      enabled: !!input,
    },
    {
      id: 'svg',
      label: 'Download SVG',
      run: () => void downloadSvg(),
      enabled: !!input,
    },
    {
      id: 'copy',
      label: 'Copy image',
      shortcut: 'Mod+Shift+C',
      run: () => void copyImage(),
      enabled: !!input,
    },
    { id: 'sample', label: 'Load sample', run: () => loadSample() },
  ]);

  const loadSample = () => {
    setCode(SAMPLE);
    update({ language: 'ts' });
    setTitle('user.ts');
    setHighlightText('5');
  };

  const codeCard = (
    <Card as="section" title="Code">
      <Stack gap="5">
        <Select
          label="Language"
          width="md"
          value={language}
          onChange={(v) => update({ language: v })}
          options={IMAGE_LANGUAGES.map((l) => ({
            value: l.id,
            label: l.label,
          }))}
        />
        <CodeEditor
          aria-label="Code"
          language={language}
          placeholder="Paste code, or open a file."
          value={code}
          onChange={setCode}
          minHeight={180}
          maxHeight={420}
        />
        <TextSourceActions
          value={code}
          onChange={setCode}
          label="Code"
          maxBytes={MAX_BYTES}
          onExample={loadSample}
          onFile={(file) => {
            setTitle(file.name);
            const lang = languageForHandoff('', file.name);
            if (lang) update({ language: lang });
          }}
          handoff={(p) => {
            if (!isCodeHandoff(p) || p.kind !== 'text') return false;
            const lang = languageForHandoff(p.mime, p.filename);
            if (lang) update({ language: lang });
            if (p.filename) setTitle(p.filename);
            return true;
          }}
        />
        <Grid columns={{ base: 1, sm: 2 }} gap="4">
          <TextField
            label="Title"
            description="Shown in the window frame and used as the file name."
            placeholder="app.ts"
            spellCheck={false}
            value={title}
            onChange={setTitle}
          />
          <TextField
            label="Highlight lines"
            description="For example 2, 5-7"
            placeholder="2, 5-7"
            inputMode="numeric"
            value={highlightText}
            onChange={setHighlightText}
            error={highlight.error ?? undefined}
          />
        </Grid>
      </Stack>
    </Card>
  );

  return (
    <TransformLayout
      start={codeCard}
      end={
        <Stack gap="6">
          <PreviewPanel
            preview={preview}
            error={error}
            busy={busy}
            empty={!input}
            scale={scale}
            canCopy={canCopyImages()}
            onPng={() => void downloadPng()}
            onSvg={() => void downloadSvg()}
            onCopy={() => void copyImage()}
            onExample={loadSample}
          />
          <StylePanel settings={s} onChange={update} />
        </Stack>
      }
      defaultSize={45}
    />
  );
}
