import { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  IconButton,
  Inline,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { IconFilePlus, IconFolderPlus } from '@/shared/ui/icons';
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
  const [side, setSide] = useState('collections');
  return (
    <Card className="min-w-0 self-start">
      <CardBody>
        <Tabs value={side} onValueChange={setSide} variant="soft" fullWidth>
          <TabsList aria-label="Saved and recent">
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="collections">
            <Stack gap="2" className="pt-3">
              <Inline gap="1" wrap>
                <IconButton
                  size="sm"
                  variant="ghost"
                  label="New request"
                  icon={<IconFilePlus size="sm" />}
                  onClick={onNewRequest}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  label="New collection"
                  icon={<IconFolderPlus size="sm" />}
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
              </Inline>
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
          </TabsContent>
          <TabsContent value="history">
            <Box className="pt-3">
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
            </Box>
          </TabsContent>
        </Tabs>
      </CardBody>
    </Card>
  );
}
