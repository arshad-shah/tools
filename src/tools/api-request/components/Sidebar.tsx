import {
  Button,
  Grid,
  IconButton,
  SegmentedControl,
  Stack,
} from '@arshad-shah/cynosure';
import { filePlus, folderPlus } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import type { HttpClientState } from '../hooks/useHttpClient';
import { emptyRequest } from '../lib/model';
import { CollectionsIO } from './CollectionsIO';
import { CollectionTree } from './CollectionTree';
import { HistoryPanel } from './HistoryPanel';

interface SidebarProps {
  client: HttpClientState;
  onNewRequest(): void;
  onNewCollection(): void;
  /** A saved or recent request was opened (the Request pane shows it). */
  onOpened(): void;
}

/** Saved collections and recent requests, beside the request. */
export function Sidebar({
  client: c,
  onNewRequest,
  onNewCollection,
  onOpened,
}: SidebarProps) {
  const [side, setSide] = useState<'collections' | 'history'>('collections');
  return (
    <Stack gap="4">
      <SegmentedControl
        label="Saved and recent"
        size="sm"
        fullWidth
        value={side}
        onChange={(v) => setSide(v as 'collections' | 'history')}
        options={[
          { value: 'collections', label: 'Collections' },
          { value: 'history', label: 'History' },
        ]}
      />
      {side === 'collections' ? (
        <Stack gap="3">
          <Grid columns="minmax(0, 1fr) auto auto" gap="1" align="center">
            <Button
              size="sm"
              variant="soft"
              icon={filePlus}
              onClick={onNewRequest}
            >
              New request
            </Button>
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              label="New collection"
              icon={folderPlus}
              onClick={onNewCollection}
            />
            <CollectionsIO
              collections={c.collections}
              environment={c.activeEnv}
              onImport={(cols, env) => {
                c.setCollections([...c.collections, ...cols]);
                if (env) c.saveEnvironments([...c.environments, env]);
              }}
            />
          </Grid>
          <CollectionTree
            collections={c.collections}
            selectedRequest={c.savedId}
            onSelectRequest={(r) => {
              c.open(r.id);
              onOpened();
            }}
            onDelete={(id) => c.remove(id)}
          />
        </Stack>
      ) : (
        <HistoryPanel
          items={c.history}
          persist={c.settings.historyPersist}
          onPersistChange={c.setHistoryPersist}
          onClear={c.clearHistory}
          onOpen={(h) => {
            c.setRequest(
              h.request ??
                emptyRequest({
                  mode: h.mode,
                  method: h.method,
                  url: h.url,
                }),
            );
            c.setSavedId(null);
            onOpened();
          }}
        />
      )}
    </Stack>
  );
}
