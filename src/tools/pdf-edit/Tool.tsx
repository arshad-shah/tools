import { useEffect, useRef, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useHandoff } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { Breadcrumb, FilePicker } from '@/shared/ui';
import type { ModeId } from '@/pdf/doc/types';
import { getMode, MODES } from '@/pdf/workspace/modes/registry';
import { OpenDocument } from '@/pdf/workspace/OpenDocument';
import { useWorkspaceSettings } from '@/pdf/workspace/settings';
import { useWorkspaceDocument } from '@/pdf/workspace/use-workspace-document';
import { WorkspaceShell } from '@/pdf/workspace/WorkspaceShell';
import { takeStagedDocument } from '@/pdf/workspace/workspace-store';
import { useOpenPalette } from '@/app/shell/palette';
import { routerLink } from '@/app/shell/router-link';
import { HelpMenu } from '@/app/shell/HelpMenu';
import { UnlockEditingDialog } from './UnlockEditingDialog';

const FALLBACK: ModeId = 'organize';

/**
 * /pdf/edit/:mode? (spec §3.2): the empty state until a document is open,
 * then the workspace. `?open=` takes staged bytes, `?doc=` restores from
 * this device and `?handoff=` takes a hub drop.
 */
export default function PdfEditTool() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const openPalette = useOpenPalette();
  const ws = useWorkspaceDocument();
  const { open: openDoc, openFiles, restore } = ws;
  const handoff = useHandoff();
  const [unlocking, setUnlocking] = useState(false);
  const started = useRef(false);
  const lastMode = useWorkspaceSettings((s) => s.lastMode);

  const requested = params.mode;
  const mode: ModeId =
    requested && getMode(requested)
      ? (requested as ModeId)
      : getMode(lastMode)
        ? lastMode
        : (MODES[0]?.id ?? FALLBACK);

  // An unknown mode shows Organize (spec §3.2: no redirects to old routes).
  useEffect(() => {
    if (!requested || getMode(requested)) return;
    notify.info(`There is no ${requested} mode; showing Organize`);
    navigate(`/pdf/edit/${FALLBACK}${location.search}`, { replace: true });
  }, [requested, navigate, location.search]);

  // ?open= and ?doc= are read once per mount.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const open = search.get('open');
    const doc = search.get('doc');
    if (open) {
      const staged = takeStagedDocument(open);
      if (staged) void openDoc(staged);
      else notify.error('That document is no longer waiting to be opened');
    } else if (doc) void restore(doc);
  }, [search, openDoc, restore]);

  useEffect(() => {
    if (handoff?.length) void openFiles(handoff);
  }, [handoff, openFiles]);

  // Once a saved document is open, its id goes in the URL so reload restores it.
  const session = ws.phase.kind === 'ready' ? ws.phase.session : null;
  const restoredUi = ws.phase.kind === 'ready' ? ws.phase.ui : null;
  useEffect(() => {
    if (!session) return;
    const id = session.model.getState().id;
    const st = session.model.getState();
    const saved = session.db && (!st.encryptedInput || st.saveOptIn);
    const next = new URLSearchParams(search);
    next.delete('open');
    if (saved) next.set('doc', id);
    else next.delete('doc');
    if (next.toString() !== search.toString())
      setSearch(next, { replace: true });
  }, [session, search, setSearch]);

  // A restored document comes back in its mode and zoom.
  useEffect(() => {
    if (!restoredUi) return;
    useWorkspaceSettings.setState({ zoom: restoredUi.viewport.zoom });
    if (!requested && getMode(restoredUi.mode))
      navigate(`/pdf/edit/${restoredUi.mode}${location.search}`, {
        replace: true,
      });
    // Only when a restore lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoredUi]);

  const breadcrumb = (
    <Breadcrumb
      segments={[{ label: 'pdf', href: '/pdf' }, { label: 'edit' }]}
      renderLink={routerLink}
    />
  );

  if (ws.phase.kind !== 'ready')
    return (
      <OpenDocument
        phase={ws.phase}
        breadcrumb={breadcrumb}
        renderLink={routerLink}
        onFiles={(files) => void ws.openFiles(files)}
        onRestore={(id) => {
          setSearch({ doc: id }, { replace: true });
          void ws.restore(id);
        }}
        onPassword={(pw) => {
          const p = ws.phase;
          if (p.kind === 'locked') void ws.open(p.file, pw);
        }}
        onRepair={() => {
          const p = ws.phase;
          if (p.kind === 'error' && p.file) void ws.repair(p.file);
        }}
        onReset={ws.close}
      />
    );

  const { phase } = ws;
  return (
    <FilePicker
      onFiles={(files) => void ws.openFiles(files)}
      accept=".pdf,application/pdf"
    >
      {(chooseFile) => (
        <>
          <WorkspaceShell
            key={phase.session.model.getState().id}
            session={phase.session}
            mode={mode}
            onModeChange={(id) =>
              navigate(`/pdf/edit/${id}${location.search}`, { replace: true })
            }
            onOpen={chooseFile}
            onSearch={openPalette}
            onUnlock={() => setUnlocking(true)}
            onOpenNew={(next) =>
              void openDoc({
                id: '',
                ...next,
                wasEncrypted: phase.session.model.getState().encryptedInput,
              })
            }
            breadcrumb={breadcrumb}
            helpMenu={(size) => <HelpMenu size={size} />}
          />
          <UnlockEditingDialog
            open={unlocking}
            onOpenChange={setUnlocking}
            session={phase.session}
            original={phase.original}
          />
        </>
      )}
    </FilePicker>
  );
}
