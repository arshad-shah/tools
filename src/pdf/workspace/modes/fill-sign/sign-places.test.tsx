/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignTarget } from '@/pdf/detect';
import type { DocumentModel } from '@/pdf/doc/model';
import { registerCoreOperations } from '@/pdf/doc/ops';
import type { SignPlaceParams } from '@/pdf/doc/ops/fill-sign';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { DocumentApi, ModeProps, SelectionApi } from '../types';
import { FieldsOverlay } from './FieldsOverlay';
import { snapToTarget } from './placement';
import { nextPlaceToSign, pageSignTargets } from './sign-places';
import { fillSign, type ReadySignature } from './store';

beforeAll(() => registerCoreOperations());
beforeEach(() => fillSign.reset());

const vector = { d: 'M0 0L40 0L40 10Z', width: 40, height: 10 };
const SIG: ReadySignature = {
  content: { kind: 'ink', vector, color: '#111827' },
  aspect: 4,
  preview: { kind: 'ink', vector, color: '#111827' },
};

const target = (o: Partial<SignTarget>): SignTarget => ({
  id: 'line',
  pageIndex: 0,
  kind: 'signature',
  rect: { x: 72, y: 585, width: 228, height: 11 },
  label: 'Signature of applicant',
  source: 'line',
  lineGap: 30,
  ...o,
});

const selection: SelectionApi = {
  pages: new Set(),
  objects: new Set(),
  selectPages: () => {},
  selectObjects: () => {},
  clear: () => {},
};

function fakeDoc(
  model: DocumentModel,
  announce: (m: string) => void = () => {},
): DocumentApi {
  const api: Partial<DocumentApi> = {
    view: model.getView(),
    state: model.getState(),
    sources: { s0: { docId: null, info: null } },
    currentPage: 'ckpt0:0',
    dispatch: (op, label) => model.dispatch(op, label),
    setDetection: (d) => model.setDetection(d),
    announce,
  };
  return api as DocumentApi;
}

const ctxOf = (doc: DocumentApi): ModeProps => ({
  doc,
  selection,
  tool: { id: null, set: () => {} },
  layout: 'standard',
});

function Harness({
  model,
  selected = [],
  announce,
}: {
  model: DocumentModel;
  selected?: string[];
  announce?: (m: string) => void;
}) {
  useSyncExternalStore(
    (l) => model.subscribe(l),
    () => model.getVersion(),
  );
  const doc = fakeDoc(model, announce);
  return (
    <FieldsOverlay
      {...ctxOf(doc)}
      selection={{ ...selection, objects: new Set(selected) }}
      page={doc.view.pages[0]}
      pageNumber={1}
      viewport={
        {
          width: 612,
          height: 792,
          transform: [1, 0, 0, -1, 0, 792],
        } as never
      }
      width={612}
      height={792}
    />
  );
}

const placed = (model: DocumentModel) =>
  model
    .getView()
    .overlays.get('ckpt0:0')
    ?.filter((o) => o.type === 'sign.place')
    .map((o) => o.params as SignPlaceParams) ?? [];

describe('SignTargetsOverlay', () => {
  it('outlines places to sign while placing; choosing one snaps the signature there', () => {
    const model = makeModel();
    fillSign.set({
      placing: 'signature',
      ready: { signature: SIG, initials: null },
      signTargets: { 's0:0': [target({})] },
    });
    render(<Harness model={model} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Signature place: Signature of applicant',
      }),
    );
    expect(placed(model).map((p) => p.rect)).toEqual([
      snapToTarget({ aspect: 4 }, target({}), 30),
    ]);
    expect(fillSign.get().placing).toBeNull();
  });

  it('shows nothing when not placing', () => {
    fillSign.set({
      ready: { signature: SIG, initials: null },
      signTargets: { 's0:0': [target({})] },
    });
    render(<Harness model={makeModel()} />);
    expect(
      screen.queryByRole('button', { name: /^Signature place/ }),
    ).toBeNull();
  });
});

describe('placed signatures', () => {
  function placeOne(
    model: DocumentModel,
    rect = { x: 72, y: 500, width: 120, height: 30 },
  ) {
    const [op] = model.dispatch({
      type: 'sign.place',
      params: {
        id: 'p1',
        pageId: 'ckpt0:0',
        rect,
        rotate: 0,
        content: SIG.content,
        role: 'signature',
      },
    });
    return op.id;
  }

  it('rotates 15 degrees with ] and keeps keyboard nudges exact near a place', () => {
    const model = makeModel();
    fillSign.set({ signTargets: { 's0:0': [target({})] } });
    const id = placeOne(model, { x: 80, y: 582, width: 100, height: 25 });
    render(<Harness model={model} selected={[id]} />);
    const frame = screen.getByRole('button', { name: 'Signature on page 1' });
    fireEvent.keyDown(frame, { key: ']' });
    fireEvent.keyUp(frame, { key: ']' });
    // 15 degrees clockwise on screen: 345 counter-clockwise, as the writer
    // turns it.
    expect(placed(model)[0].rotate).toBe(345);
    fireEvent.keyDown(frame, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyUp(frame, { key: 'ArrowRight' });
    expect(placed(model)[0].rect).toMatchObject({ x: 90, y: 582 });
  });

  it('snaps a dragged signature to a place nearby and says so', () => {
    const model = makeModel();
    const announce = vi.fn();
    fillSign.set({ signTargets: { 's0:0': [target({})] } });
    const id = placeOne(model);
    render(<Harness model={model} selected={[id]} announce={announce} />);
    const frame = screen.getByRole('button', { name: 'Signature on page 1' });
    // Page y 500 to about 585: the overlay's y axis points down.
    fireEvent.pointerDown(frame, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(frame, { clientX: 110, clientY: 18 });
    fireEvent.pointerUp(frame, { clientX: 110, clientY: 18 });
    expect(placed(model)[0].rect).toEqual(
      snapToTarget({ aspect: 4 }, target({}), 30),
    );
    expect(announce).toHaveBeenCalledWith('Snapped to Signature of applicant');
  });
});

describe('nextPlaceToSign', () => {
  const two = [
    target({ id: 'low', rect: { x: 72, y: 300, width: 200, height: 11 } }),
    target({ id: 'high', label: 'Signed', source: 'underscore' }),
  ];

  it('places the ready signature at each place in reading order, wrapping', async () => {
    const model = makeModel();
    const announce = vi.fn();
    const goToPage = vi.fn();
    fillSign.set({
      ready: { signature: SIG, initials: null },
      signTargets: { 's0:0': two },
      goToPage,
    });
    await nextPlaceToSign(ctxOf(fakeDoc(model, announce)));
    await nextPlaceToSign(ctxOf(fakeDoc(model, announce)));
    await nextPlaceToSign(ctxOf(fakeDoc(model, announce)));
    expect(placed(model).map((p) => p.rect.y)).toEqual([
      snapToTarget({ aspect: 4 }, two[1], 30).y,
      snapToTarget({ aspect: 4 }, two[0], 30).y,
      snapToTarget({ aspect: 4 }, two[1], 30).y,
    ]);
    expect(goToPage).toHaveBeenCalledWith('ckpt0:0');
    expect(announce).toHaveBeenCalledWith(
      'Placed at Signed. Use the arrow keys to move it.',
    );
  });

  it('opens the signature panel for the place when nothing is ready', async () => {
    fillSign.set({ signTargets: { 's0:0': [target({ kind: 'initials' })] } });
    await nextPlaceToSign(ctxOf(fakeDoc(makeModel())));
    const s = fillSign.get();
    expect(s.dialog).toBe('signature');
    expect(s.panelRole).toBe('initials');
    expect(s.signTarget?.target?.id).toBe('line');
  });

  it('starts a date on a date place and reports when there are none', async () => {
    fillSign.set({
      signTargets: { 's0:0': [target({ kind: 'date', label: 'Date' })] },
    });
    await nextPlaceToSign(ctxOf(fakeDoc(makeModel())));
    expect(fillSign.get().draft).toMatchObject({
      pageId: 'ckpt0:0',
      kind: 'date',
      rect: { x: 76, y: 586 },
    });
    fillSign.reset();
    fillSign.set({ signTargets: {} });
    const announce = vi.fn();
    await nextPlaceToSign(ctxOf(fakeDoc(makeModel(), announce)));
    expect(announce).toHaveBeenCalledWith('No places to sign found');
  });
});

describe('pageSignTargets', () => {
  it('adds unsigned /Sig fields and drops detected places under them', () => {
    const model = makeModel();
    const page = model.getView().pages[0];
    const rect = { x: 60, y: 580, width: 260, height: 40 };
    const targets = pageSignTargets(
      page,
      { 's0:0': [target({})] },
      {
        s0: {
          hasAcroForm: true,
          hasXfa: false,
          widgets: [
            {
              fieldName: 'Sig1',
              kind: 'signature',
              pageIndex: 0,
              rect,
              readOnly: false,
              value: '',
              label: null,
            },
          ],
        },
      },
    );
    expect(targets.map((t) => [t.source, t.label])).toEqual([
      ['sig-field', 'Sig1'],
    ]);
  });

  it('leaves out /Sig fields the verifier reports as signed', () => {
    const model = makeModel();
    const page = model.getView().pages[0];
    const widget = (fieldName: string, x: number) => ({
      fieldName,
      kind: 'signature' as const,
      pageIndex: 0,
      rect: { x, y: 580, width: 200, height: 40 },
      readOnly: false,
      value: '',
      label: null,
    });
    const targets = pageSignTargets(
      page,
      {},
      {
        s0: {
          hasAcroForm: true,
          hasXfa: false,
          widgets: [widget('Signed1', 60), widget('Empty1', 300)],
        },
      },
      { s0: ['Signed1'] },
    );
    expect(targets.map((t) => t.label)).toEqual(['Empty1']);
  });
});
