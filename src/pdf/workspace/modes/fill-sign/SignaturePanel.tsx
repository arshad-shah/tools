import { useCallback, useState } from 'react';
import {
  IconCamera,
  IconFieldSignature,
  IconInitials,
  IconNextSignTarget,
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
import { newId } from '@/shared/lib/id';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import type { SignatureSource } from '@/pdf/sign';
import type { BlockContent } from '@/pdf/sign/block';
import type { PageAnchor } from '@/pdf/doc/ops/fill-sign';
import type { NewOperation } from '@/pdf/doc/types';
import type { ModeProps } from '../types';
import { fitAspect, placeSignature } from './actions';
import { InitialPagesDialog } from './InitialPagesDialog';
import { defaultInitialsAnchor, selectedInitialsAnchor } from './initials-spot';
import { pageCentre, prepare } from './prepare-signature';
import { nextPlaceToSign, targetBox } from './sign-places';
import { SignatureBlockForm } from './SignatureBlockForm';
import { SignatureInitials } from './SignatureInitials';
import { SignatureInk } from './SignatureInk';
import { SignaturePhoto } from './SignaturePhoto';
import { SignatureTypeGallery } from './SignatureTypeGallery';
import { SignatureUpload } from './SignatureUpload';
import { fillSign, useFillSign, type ReadySignature } from './store';

type Tab = 'draw' | 'type' | 'photo' | 'initials' | 'block' | 'upload';
type Role = 'signature' | 'initials';

/** A block's width in points; the signature takes 55% of its height. */
const BLOCK_WIDTH = 200;
const BLOCK_SIGNATURE_MAX = 80;
const BLOCK_SIGNATURE_SHARE = 0.55;

/** Initials ready for "Initial pages", with where they would go. */
interface InitialPagesRequest {
  sig: ReadySignature;
  selected: PageAnchor | null;
  fallback: PageAnchor;
}

/**
 * Make a signature, initials or a signature block (spec §8.1, plan H-14):
 * draw, type, photograph or upload it, then place it with the pointer, at
 * the page centre, in a field, or at the next place to sign. No saved
 * signatures (decision G12); the copy states it is a picture, not a
 * certificate signature.
 */
export function SignaturePanel({ ctx }: { ctx: ModeProps }) {
  const panelRole = useFillSign((s) => s.panelRole);
  const target = useFillSign((s) => s.signTarget);
  const name = useFillSign((s) => s.typedName);
  const madeSignature = useFillSign((s) => s.ready.signature);
  const [tab, setTab] = useState<Tab>(
    panelRole === 'initials' ? 'initials' : 'draw',
  );
  const [source, setSource] = useState<SignatureSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialPages, setInitialPages] = useState<InitialPagesRequest | null>(
    null,
  );
  const role: Role = tab === 'initials' ? 'initials' : 'signature';
  const what = role === 'initials' ? 'initials' : 'signature';
  const setName = useCallback(
    (typedName: string) => fillSign.set({ typedName }),
    [],
  );

  const ready = async (as: Role = role) => {
    if (!source) return null;
    setBusy(true);
    try {
      const sig = await prepare(ctx, source);
      fillSign.set({ ready: { ...fillSign.get().ready, [as]: sig } });
      return sig;
    } catch (e) {
      notify.error(toToolError(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const switchTab = async (next: Tab) => {
    // A signature made but not placed yet is what the block uses.
    if (next === 'block' && source && role === 'signature') await ready();
    setTab(next);
    setSource(null);
    fillSign.set({ panelRole: next === 'initials' ? 'initials' : 'signature' });
  };

  const placeAtCentre = async () => {
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
  };

  const placeBlock = (content: BlockContent, aspect: number) => {
    const at = pageCentre(ctx);
    if (!at) return;
    const width = BLOCK_WIDTH;
    const height =
      Math.min(width / aspect, BLOCK_SIGNATURE_MAX) / BLOCK_SIGNATURE_SHARE;
    const ops = ctx.doc.dispatch({
      type: 'sign.block',
      params: {
        id: newId(),
        pageId: at.page.id,
        rect: { x: at.x - width / 2, y: at.y - height / 2, width, height },
        rotate: 0,
        content,
      },
    });
    if (!ops.length) return;
    fillSign.set({ dialog: null, signTarget: null });
    ctx.selection.selectObjects([ops[0].id]);
    ctx.doc.announce(
      'Signature block placed at the page centre. Use the arrow keys to move it.',
    );
  };

  const openInitialPages = async () => {
    const sig = await ready('initials');
    if (!sig) return;
    setInitialPages({
      sig,
      selected: selectedInitialsAnchor(ctx),
      fallback: defaultInitialsAnchor(ctx, sig.aspect),
    });
  };

  const dispatchInitialPages = (op: NewOperation) => {
    const ops = ctx.doc.dispatch(op);
    if (ops.length) {
      fillSign.set({ dialog: null, signTarget: null });
      ctx.doc.announce('Initials placed on the chosen pages');
    }
    return ops;
  };

  const goNext = async () => {
    if (source && tab !== 'block' && !(await ready())) return;
    fillSign.set({ dialog: null, signTarget: null });
    void nextPlaceToSign(ctx);
  };

  return (
    <Stack gap="3" className="min-w-0">
      <Tabs value={tab} onValueChange={(t) => void switchTab(t as Tab)}>
        <TabsList aria-label="Signature method" className="flex-wrap">
          <TabsTrigger value="draw">
            <IconSignatureDraw size="sm" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="type">
            <IconSignatureType size="sm" />
            Type
          </TabsTrigger>
          <TabsTrigger value="photo">
            <IconCamera size="sm" />
            Photo
          </TabsTrigger>
          <TabsTrigger value="initials">
            <IconInitials size="sm" />
            Initials
          </TabsTrigger>
          <TabsTrigger value="block">
            <IconFieldSignature size="sm" />
            Block
          </TabsTrigger>
          <TabsTrigger value="upload">
            <IconSignatureUpload size="sm" />
            Upload
          </TabsTrigger>
        </TabsList>
        <TabsContent value="draw">
          <SignatureInk onChange={setSource} disabled={busy} />
        </TabsContent>
        <TabsContent value="type">
          <SignatureTypeGallery
            name={name}
            onNameChange={setName}
            onChange={setSource}
            disabled={busy}
          />
        </TabsContent>
        <TabsContent value="photo">
          <SignaturePhoto onChange={setSource} disabled={busy} />
        </TabsContent>
        <TabsContent value="initials">
          <SignatureInitials
            name={name}
            onChange={setSource}
            disabled={busy}
            ready={source !== null}
            onInitialPages={() => void openInitialPages()}
          />
        </TabsContent>
        <TabsContent value="block">
          <SignatureBlockForm
            signature={madeSignature}
            name={name}
            disabled={busy}
            onPlace={placeBlock}
          />
        </TabsContent>
        <TabsContent value="upload">
          <SignatureUpload onChange={setSource} disabled={busy} />
        </TabsContent>
      </Tabs>
      <Text size="sm" tone="muted">
        This is a picture of your signature. For a certificate-backed signature,
        turn on Digital signature when you export.
      </Text>
      <div className="flex flex-wrap gap-2">
        {tab !== 'block' && target ? (
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
        {tab !== 'block' ? (
          <>
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
              onClick={() => void placeAtCentre()}
            >
              Place at page centre
            </Button>
          </>
        ) : null}
        <Button
          variant="ghost"
          leftIcon={<IconNextSignTarget size="sm" />}
          disabled={busy}
          onClick={() => void goNext()}
        >
          Next place to sign
        </Button>
      </div>
      {initialPages ? (
        <InitialPagesDialog
          open
          onOpenChange={(o) => {
            if (!o) setInitialPages(null);
          }}
          pageIds={ctx.doc.view.pages.map((p) => p.id)}
          content={initialPages.sig.content}
          selectedAnchor={initialPages.selected}
          defaultAnchor={initialPages.fallback}
          dispatch={dispatchInitialPages}
        />
      ) : null}
    </Stack>
  );
}
