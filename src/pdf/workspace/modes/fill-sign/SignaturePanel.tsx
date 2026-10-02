import { useState } from 'react';
import {
  IconCamera,
  IconSignatureDraw,
  IconSignatureType,
  IconSignatureUpload,
} from '@/shared/ui/icons';
import {
  Button,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import {
  fetchFontBytes,
  fontById,
  inkAspect,
  loadSignatureFont,
  type SignatureSource,
} from '@/pdf/sign';
import { layoutInk } from '@/pdf/edit/text-fit';
import type { ModeProps } from '../types';
import { fitAspect, placeSignature } from './actions';
import { targetBox } from './sign-places';
import { SignatureDraw } from './SignatureDraw';
import { SignaturePhoto } from './SignaturePhoto';
import { SignatureType } from './SignatureType';
import { SignatureUpload } from './SignatureUpload';
import { fillSign, useFillSign, type ReadySignature } from './store';

/** Turns the panel's source into a placeable signature (assets stored once). */
async function prepare(
  ctx: ModeProps,
  source: SignatureSource,
): Promise<ReadySignature> {
  if (source.kind === 'ink' || source.kind === 'trace') {
    // The vector travels in the op itself: nothing to store. Traced photos
    // fill even-odd so the holes in loops stay open.
    const { kind, vector, color } = source;
    return {
      content: { kind, vector, color },
      aspect: vector.width / vector.height,
      preview: { kind: 'ink', vector, color, evenOdd: kind === 'trace' },
    };
  }
  if (source.kind === 'image') {
    const mime: 'image/png' | 'image/jpeg' =
      source.format === 'png' ? 'image/png' : 'image/jpeg';
    const assetId = ctx.doc.addAsset(source.bytes, mime);
    const preview = { kind: 'image' as const, bytes: source.bytes, mime };
    fillSign.set({
      previews: { ...fillSign.get().previews, [assetId]: preview },
    });
    return {
      content: { kind: 'image', assetId, mime },
      aspect: source.width / source.height,
      preview,
    };
  }
  const [bytes, font] = await Promise.all([
    fetchFontBytes(source.fontId),
    loadSignatureFont(source.fontId),
  ]);
  const fontAsset = ctx.doc.addAsset(bytes, 'font/woff');
  const preview = {
    kind: 'text' as const,
    text: source.text,
    family: fontById(source.fontId).family,
    color: source.color,
  };
  fillSign.set({
    previews: { ...fillSign.get().previews, [fontAsset]: preview },
  });
  return {
    content: {
      kind: 'text',
      text: source.text,
      fontId: source.fontId,
      fontAsset,
      color: source.color,
    },
    aspect: inkAspect(layoutInk(font, source.text)),
    preview,
  };
}

/** The page centre in page space, as displayed. */
function pageCentre(ctx: ModeProps) {
  const page = ctx.doc.view.pages.find((p) => p.id === ctx.doc.currentPage);
  if (!page) return null;
  const g = ctx.doc.pageGeom(page);
  const box = page.crop ?? {
    x: g.view[0],
    y: g.view[1],
    width: g.view[2] - g.view[0],
    height: g.view[3] - g.view[1],
  };
  return { page, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Make a signature or initials (spec §8.1): draw, type or upload, then
 * place it with the pointer or at the page centre. No saved signatures
 * (decision G12); the copy states it is a picture, not a certificate.
 */
export function SignaturePanel({ ctx }: { ctx: ModeProps }) {
  const role = useFillSign((s) => s.panelRole);
  const target = useFillSign((s) => s.signTarget);
  const [tab, setTab] = useState('draw');
  const [source, setSource] = useState<SignatureSource | null>(null);
  const [busy, setBusy] = useState(false);
  const what = role === 'initials' ? 'initials' : 'signature';

  const ready = async () => {
    if (!source) return null;
    setBusy(true);
    try {
      const sig = await prepare(ctx, source);
      fillSign.set({ ready: { ...fillSign.get().ready, [role]: sig } });
      return sig;
    } catch (e) {
      notify.error(toToolError(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="3">
      <Tabs
        value={tab}
        onValueChange={(t) => {
          setTab(t);
          setSource(null);
        }}
      >
        <TabsList aria-label={`How to make your ${what}`}>
          <TabsTrigger value="draw">
            <IconSignatureDraw size="sm" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="type">
            <IconSignatureType size="sm" />
            Type
          </TabsTrigger>
          <TabsTrigger value="upload">
            <IconSignatureUpload size="sm" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="photo">
            <IconCamera size="sm" />
            Photo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="draw">
          <SignatureDraw onChange={setSource} disabled={busy} />
        </TabsContent>
        <TabsContent value="type">
          <SignatureType onChange={setSource} disabled={busy} />
        </TabsContent>
        <TabsContent value="upload">
          <SignatureUpload onChange={setSource} disabled={busy} />
        </TabsContent>
        <TabsContent value="photo">
          <SignaturePhoto onChange={setSource} disabled={busy} />
        </TabsContent>
      </Tabs>
      <Text size="sm" tone="muted">
        This is a picture of your signature, not a certificate signature.
      </Text>
      <div className="flex flex-wrap gap-2">
        {target ? (
          <Button
            variant="primary"
            disabled={!source || busy}
            onClick={async () => {
              const sig = await ready();
              if (!sig) return;
              fillSign.set({ dialog: null, signTarget: null });
              placeSignature(
                ctx,
                target.pageId,
                target.target
                  ? targetBox(target.target, sig.aspect)
                  : fitAspect(target.rect, sig.aspect),
                sig,
                role,
              );
            }}
          >
            Place in field
          </Button>
        ) : null}
        <Button
          variant={target ? 'secondary' : 'primary'}
          disabled={!source || busy}
          onClick={async () => {
            if (!(await ready())) return;
            fillSign.set({ placing: role, dialog: null, signTarget: null });
            ctx.doc.announce(`Click on a page to place your ${what}`);
          }}
        >
          Place
        </Button>
        <Button
          variant="secondary"
          disabled={!source || busy}
          onClick={async () => {
            const sig = await ready();
            const at = pageCentre(ctx);
            if (!sig || !at) return;
            fillSign.set({ dialog: null });
            const w = role === 'initials' ? 60 : 180;
            const h = w / sig.aspect;
            placeSignature(
              ctx,
              at.page.id,
              { x: at.x - w / 2, y: at.y - h / 2, width: w, height: h },
              sig,
              role,
            );
            ctx.doc.announce(
              `Placed at the page centre. Use the arrow keys to move it.`,
            );
          }}
        >
          Place at page centre
        </Button>
      </div>
    </Stack>
  );
}
