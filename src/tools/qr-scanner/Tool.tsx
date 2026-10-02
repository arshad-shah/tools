import { useRef, useState } from 'react';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { useHandoffFiles } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { decodeBarcodes, type DecodedBarcode } from '@/shared/lib/qr-decode';
import { useToolCommands } from '@/shared/lib/tool-commands';
import {
  Alert,
  AlertDescription,
  Box,
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
  ErrorState,
  Image,
  LoadingState,
  PrivacyNote,
  ShapeLayer,
  Sized,
  Stack,
  type Shape,
} from '@/shared/ui';
import { IconPlay } from '@/shared/ui/icons';
import { ResultCard } from './components/ResultCard';
import { ScanSources, type SourceMode } from './components/ScanSources';

const MAX_PREVIEW = 640;
const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

interface Scanned {
  image: Blob | null;
  width: number;
  height: number;
  results: DecodedBarcode[];
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

  const scale = scanned ? Math.min(1, MAX_PREVIEW / scanned.width) : 1;
  const shapes: Shape[] =
    scanned?.results.map((r) => ({
      kind: 'rect',
      box: { x: r.box.x, y: r.box.y, width: r.box.w, height: r.box.h },
      stroke: { token: 'accent' },
      width: 3,
    })) ?? [];

  return (
    <Stack gap="4">
      <PrivacyNote variant="local">
        Images and camera frames are read in this browser and never stored.
      </PrivacyNote>
      <Card>
        <CardBody>
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
            onError={setError}
          />
        </CardBody>
      </Card>

      {busy && <LoadingState label="Reading codes" />}
      {error && <ErrorState error={error} title="Could not scan" />}

      {scanned && !busy && (
        <Stack gap="3">
          {scanned.image && (
            <Card>
              <CardBody>
                <Box className="overflow-auto">
                  <Sized
                    width={Math.round(scanned.width * scale)}
                    height={Math.round(scanned.height * scale)}
                    className="relative"
                    data-testid="scan-preview"
                  >
                    <Image
                      src={scanned.image}
                      alt="Scanned image"
                      fit="contain"
                      className="absolute inset-0 h-full w-full"
                    />
                    <ShapeLayer
                      width={Math.round(scanned.width * scale)}
                      height={Math.round(scanned.height * scale)}
                      transform={{ ...IDENTITY, a: scale, d: scale }}
                      shapes={shapes}
                    />
                  </Sized>
                </Box>
              </CardBody>
            </Card>
          )}
          {scanned.results.length === 0 ? (
            <EmptyState>
              <EmptyStateTitle>No code found</EmptyStateTitle>
              <EmptyStateDescription>
                Try a sharper or larger image, with the whole code in view and a
                light margin around it.
              </EmptyStateDescription>
            </EmptyState>
          ) : (
            <>
              <Alert status="success">
                <AlertDescription>
                  Found {scanned.results.length}{' '}
                  {scanned.results.length === 1 ? 'code' : 'codes'}.
                </AlertDescription>
              </Alert>
              {scanned.results.map((r, i) => (
                <ResultCard key={`${i}-${r.text}`} result={r} index={i} />
              ))}
            </>
          )}
          {mode === 'camera' && !camera && (
            <Button
              variant="primary"
              leftIcon={<IconPlay size="sm" />}
              onClick={() => setCamera(true)}
            >
              Continue scanning
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}
