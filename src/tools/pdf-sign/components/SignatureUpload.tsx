import React, { useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Inline,
  Label,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
import type { LoadedFile } from '@/shared/lib/files';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { useObjectUrl } from '@/shared/lib/object-url';
import { uprightJpeg } from '@/shared/lib/upright-jpeg';
import { PdfDropzone } from '@/pdf/components';
import { opaqueBounds, removeWhiteBackground } from '../lib/pixels';
import {
  canvasToPng,
  type SignatureSource,
  type SignatureSourceProps,
} from '../lib/signature';

type ImageSource = Extract<SignatureSource, { kind: 'image' }>;

async function decode(file: LoadedFile): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(
      new Blob([file.bytes as Uint8Array<ArrayBuffer>], {
        type: file.kind === 'jpeg' ? 'image/jpeg' : 'image/png',
      }),
    );
  } catch {
    throw new ToolError('INVALID_FILE', 'This image could not be read');
  }
}

/** The uploaded image, optionally with its white background removed and cropped. */
async function prepare(
  file: LoadedFile,
  removeBg: boolean,
): Promise<ImageSource | null> {
  const bitmap = await decode(file);
  try {
    const { width, height } = bitmap;
    if (!removeBg) {
      if (file.kind === 'jpeg') {
        // Store the pixels upright (EXIF orientation applied), so the stamp
        // matches the preview and its box.
        const upright = await uprightJpeg(file.bytes);
        return { kind: 'image', format: 'jpeg', ...upright };
      }
      return { kind: 'image', bytes: file.bytes, format: 'png', width, height };
    }
    const full = new OffscreenCanvas(width, height);
    const ctx = full.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const pixels = removeWhiteBackground(
      ctx.getImageData(0, 0, width, height).data,
    );
    const box = opaqueBounds(pixels, width, height);
    if (!box) return null;
    const cropped = new OffscreenCanvas(box.width, box.height);
    cropped
      .getContext('2d')!
      .putImageData(
        new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, width, height),
        -box.x,
        -box.y,
      );
    return {
      kind: 'image',
      bytes: await canvasToPng(cropped),
      format: 'png',
      width: box.width,
      height: box.height,
    };
  } finally {
    bitmap.close();
  }
}

export const SignatureUpload: React.FC<SignatureSourceProps> = ({
  onChange,
  disabled,
}) => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [removeBg, setRemoveBg] = useState(false);
  const [result, setResult] = useState<ImageSource | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const run = useRef(0);
  const previewUrl = useObjectUrl(
    result?.bytes ?? null,
    result?.format === 'jpeg' ? 'image/jpeg' : 'image/png',
  );

  const update = async (next: LoadedFile | null, remove: boolean) => {
    const id = ++run.current;
    setFile(next);
    setRemoveBg(remove);
    setResult(null);
    setProblem(null);
    if (!next) {
      onChange(null);
      return;
    }
    try {
      const source = await prepare(next, remove);
      if (id !== run.current) return;
      setResult(source);
      if (!source)
        setProblem('The image is blank after removing the background');
      onChange(source);
    } catch (e) {
      if (id !== run.current) return;
      setProblem(toToolError(e).message);
      onChange(null);
    }
  };

  return (
    <Stack gap="3">
      {file ? (
        <Inline justify="between" align="center" gap="3" wrap>
          <Text weight="semibold">{file.name}</Text>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => void update(null, removeBg)}
          >
            Choose another image
          </Button>
        </Inline>
      ) : (
        <PdfDropzone
          accept={['png', 'jpeg']}
          label="Drop a PNG or JPEG of your signature"
          disabled={disabled}
          onFiles={(files) => void update(files[0], removeBg)}
        />
      )}
      <Inline gap="3" align="center">
        <Switch
          id="sig-remove-bg"
          aria-label="Remove white background"
          checked={removeBg}
          disabled={disabled}
          onCheckedChange={(on) => void update(file, on)}
        />
        <Label htmlFor="sig-remove-bg">Remove white background</Label>
      </Inline>
      {problem && (
        <Alert status="danger">
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      )}
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Signature preview"
          className="max-h-32 max-w-full self-start rounded-md border border-line bg-white object-contain p-2"
        />
      )}
    </Stack>
  );
};
