import React, { useRef, useState } from 'react';
import {
  Button,
  Inline,
  Notice,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import type { LoadedFile } from '@/shared/lib/files';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { uprightJpeg } from '@/pdf/components/upright-jpeg';
import { PdfIntake } from '@/pdf/ui/PdfIntake';
import { SamplePaper } from '@/pdf/surfaces/InkSample';
import { BytesImage } from '@/pdf/surfaces/BytesImage';
import { opaqueBounds, removeWhiteBackground } from '@/pdf/sign';
import {
  canvasToPng,
  type SignatureSource,
  type SignatureSourceProps,
} from '@/pdf/sign';

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
          <Text weight="bold">{file.name}</Text>
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
        <PdfIntake
          accept={['png', 'jpeg']}
          size="md"
          prompt="Drop a PNG or JPEG of your signature, or"
          disabled={disabled}
          onFiles={(files) => void update(files[0], removeBg)}
        />
      )}
      <Switch
        label="Remove white background"
        checked={removeBg}
        disabled={disabled}
        onChange={(on) => void update(file, on)}
      />
      {problem && <Notice tone="danger">{problem}</Notice>}
      {result && (
        <SamplePaper height={128}>
          <BytesImage
            bytes={result.bytes}
            mime={result.format === 'jpeg' ? 'image/jpeg' : 'image/png'}
            fit="contain"
            label="Signature preview"
          />
        </SamplePaper>
      )}
    </Stack>
  );
};
