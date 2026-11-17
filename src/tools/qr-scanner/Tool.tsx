import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { sendTo, useHandoffFiles } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { decodeBarcodes, type DecodedBarcode } from '@/shared/lib/qr-decode';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import {
  Button,
  Card,
  EmptyState,
  Grid,
  Image,
  Notice,
  ProgressBar,
  Stack,
} from '@arshad-shah/cynosure';
import {
  play,
  qrCode as qrCodeIcon,
  search,
} from '@arshad-shah/cynosure/icons';
import { ResultCard } from './components/ResultCard';
import { ScanSources, type SourceMode } from './components/ScanSources';
import { resultHandoffs, type ResultTarget } from './lib/handoffs';

interface Scanned {
  image: Blob | null;
  width: number;
  height: number;
  results: DecodedBarcode[];
}

/** Pastes into these are typing, not an image to scan. */
function isTextField(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.isContentEditable ||
    t instanceof HTMLTextAreaElement ||
    (t instanceof HTMLInputElement &&
      !['button', 'checkbox', 'radio', 'file', 'range', 'color'].includes(
        t.type,
      ))
  );
}

/** The first image among pasted clipboard items, if any. */
function pastedImage(e: ClipboardEvent): File | null {
  for (const item of e.clipboardData?.items ?? []) {
    if (item.kind === 'file' && item.type.startsWith('image/'))
      return item.getAsFile();
  }
  return null;
}

async function readClipboardImage(): Promise<Blob> {
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (type) return item.getType(type);
  }
  throw new ToolError('INVALID_INPUT', 'The clipboard has no image');
}

export default function QrScanner() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SourceMode>('image');
  const [camera, setCamera] = useState(false);
  const [scanned, setScanned] = useState<Scanned | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [busy, setBusy] = useState(false);
  const decoding = useRef(false);
  const job = useRef(0);

  const scanImage = async (blob: Blob) => {
    const id = ++job.current;
    setBusy(true);
    setError(null);
    try {
      const bitmap = await createImageBitmap(blob).catch((cause: unknown) => {
        throw new ToolError(
          'INVALID_FILE',
          'This file is not an image this browser can read',
          {
            cause,
          },
        );
      });
      const { width, height } = bitmap;
      const results = await decodeBarcodes(blob);
      bitmap.close();
      if (id !== job.current) return;
      setScanned({ image: blob, width, height, results });
    } catch (e) {
      if (id === job.current) {
        setScanned(null);
        setError(toToolError(e, 'Could not read this image'));
      }
    } finally {
      if (id === job.current) setBusy(false);
    }
  };

  const onFrame = (bitmap: ImageBitmap) => {
    if (decoding.current) {
      bitmap.close();
      return;
    }
    decoding.current = true;
    const { width, height } = bitmap;
    decodeBarcodes(bitmap)
      .then((results) => {
        if (results.length) {
          setCamera(false);
          setScanned({ image: null, width, height, results });
        }
      })
      .catch((e: unknown) =>
        setError(toToolError(e, 'Could not read the camera frame')),
      )
      .finally(() => {
        decoding.current = false;
        bitmap.close();
      });
  };

  const paste = async () => {
    try {
      await scanImage(await readClipboardImage());
    } catch (e) {
      notify.error(
        toToolError(e, 'Could not read an image from the clipboard'),
      );
    }
  };

  useHandoffFiles((files) => {
    if (files[0]) void scanImage(files[0]);
  });

  // Mod+V anywhere on the page scans a pasted image (spec 9.2); typing in a
  // text field keeps its own paste.
  const scanLatest = useRef(scanImage);
  useEffect(() => {
    scanLatest.current = scanImage;
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented || isTextField(e.target)) return;
      const file = pastedImage(e);
      if (!file) return;
      e.preventDefault();
      void scanLatest.current(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  useToolCommands('qr-scanner', [
    { id: 'paste', label: 'Paste image', run: () => void paste() },
    {
      id: 'clear',
      label: 'Clear',
      shortcut: 'Mod+Shift+X',
      run: () => {
        setScanned(null);
        setError(null);
      },
    },
  ]);

  // The palette mirrors the first code's hand-off buttons (one id per target).
  const first = scanned && !busy ? scanned.results[0] : undefined;
  const firstHandoffs = first ? resultHandoffs(first) : {};
  const send = (target: ResultTarget) => ({
    target,
    run: () => {
      const payload = firstHandoffs[target];
      if (payload) sendTo(navigate, target, payload);
    },
    enabled: !!firstHandoffs[target],
  });
  useSendCommands('qr-scanner', [
    send('url-parser'),
    send('qr-code-generator'),
    send('url-encoder-decoder'),
  ]);

  // The scanned picture as an object URL for Image, revoked when replaced.
  const preview = useMemo(
    () => (scanned?.image ? URL.createObjectURL(scanned.image) : null),
    [scanned],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const count = scanned?.results.length ?? 0;
  const results = busy ? (
    <Card as="section" title="Results">
      <ProgressBar label="Reading codes" indeterminate />
    </Card>
  ) : scanned ? (
    <Stack gap="5">
      <Card as="section" title="Results">
        <Stack gap="4">
          {preview ? (
            <Image
              src={preview}
              alt="Scanned image"
              ratio={scanned.width / scanned.height}
              fit="contain"
              radius="sm"
              regions={scanned.results.map((r, i) => ({
                x: r.box.x,
                y: r.box.y,
                width: r.box.w,
                height: r.box.h,
                label: String(i + 1),
                tone: 'accent',
              }))}
            />
          ) : null}
          {count === 0 ? (
            <EmptyState
              size="sm"
              icon={search}
              title="No code found"
              description="Try a sharper or larger image, with the whole code in view and a light margin around it."
            />
          ) : (
            <Notice tone="success">
              {`Found ${count} ${count === 1 ? 'code' : 'codes'}.`}
            </Notice>
          )}
          {mode === 'camera' && !camera ? (
            <Button variant="solid" icon={play} onClick={() => setCamera(true)}>
              Continue scanning
            </Button>
          ) : null}
        </Stack>
      </Card>
      {scanned.results.map((r, i) => (
        <ResultCard key={`${i}-${r.text}`} result={r} index={i} />
      ))}
    </Stack>
  ) : (
    <Card as="section" title="Results">
      <EmptyState
        icon={qrCodeIcon}
        title="Nothing scanned yet"
        description="Choose, drop or paste an image, or use the camera. Images and camera frames are read in this browser and never stored."
      />
    </Card>
  );

  return (
    <Stack gap="6">
      {error ? (
        <Notice
          tone="danger"
          title="Could not scan"
          dismissible
          onDismiss={() => setError(null)}
        >
          {error.message}
        </Notice>
      ) : null}
      <Grid columns={{ base: 1, lg: 2 }} gap="6" align="start">
        <Card as="section" title="Scan">
          <ScanSources
            mode={mode}
            onModeChange={(m) => {
              setMode(m);
              if (m === 'image') setCamera(false);
            }}
            onImage={(b) => void scanImage(b)}
            onPaste={() => void paste()}
            cameraActive={camera}
            onCameraActiveChange={setCamera}
            onFrame={onFrame}
          />
        </Card>
        {results}
      </Grid>
    </Stack>
  );
}
