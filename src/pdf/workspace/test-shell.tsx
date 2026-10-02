// Test-only: a WorkspaceShell over an in-memory 3-page document.
import { vi } from 'vitest';
import { BlobStore } from '@/pdf/doc/blob-store';
import { inProcessServices } from '@/pdf/doc/test-services';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { DocInfo } from '@/pdf/render';
import { DEFAULT_WORKSPACE_SETTINGS, useWorkspaceSettings } from './settings';
import { SourceDocs } from './source-docs';
import { WorkspaceShell } from './WorkspaceShell';

export const INFO: DocInfo = {
  docId: 'r1',
  pageCount: 3,
  pages: Array.from({ length: 3 }, () => ({
    width: 612,
    height: 792,
    view: [0, 0, 612, 792] as [number, number, number, number],
    rotate: 0 as const,
  })),
};

/** jsdom lacks these; the kit only needs them to exist. */
export function stubLayoutApis(phone = () => false) {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', RO);
  vi.stubGlobal('IntersectionObserver', RO);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (q: string) =>
      ({
        matches: q.includes('max-width: 899px') ? phone() : false,
        media: q,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  useWorkspaceSettings.setState(DEFAULT_WORKSPACE_SETTINGS);
}

export function shellHarness() {
  const model = makeModel();
  const render = {
    open: vi.fn(async () => INFO),
    close: vi.fn(async () => {}),
    onRestart: () => () => {},
    generation: () => 0,
  };
  const sourceDocs = new SourceDocs(render, async () => new Uint8Array());
  sourceDocs.seed('s0', INFO);
  const session = {
    model,
    blobs: new BlobStore(null, 'doc1'),
    services: inProcessServices({ render: render as never }),
    sourceDocs,
    db: null,
  };
  const ui = (
    <WorkspaceShell
      session={session}
      mode="organize"
      onModeChange={() => {}}
      onOpen={() => {}}
      onSearch={() => {}}
      onUnlock={() => {}}
      onOpenNew={() => {}}
      breadcrumb={<span>pdf / edit</span>}
    />
  );
  return { model, session, ui };
}
