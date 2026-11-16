import {
  Card,
  Grid,
  Heading,
  IconButton,
  IconTile,
  ListRow,
  ListRows,
  Stack,
} from '@arshad-shah/cynosure';
import { filePen, trash } from '@arshad-shah/cynosure/icons';
import { useNavigate } from 'react-router-dom';
import { relativeTime } from '@/pdf/workspace/relative-time';
import { useRecentDocuments } from '@/pdf/workspace/use-recent-documents';
import { useFavorites } from '../../favorites';
import { useRecentToolsStore } from '../../recents';
import { getEnabledTools } from '../../registry';
import { toolPath } from '../../routes';
import type { ToolManifest } from '../../tool';
import { toolGlyph } from '../../ui/glyphs';
import { FavouriteToggle } from '../../ui/ToolCard';

function ToolRows({ label, tools }: { label: string; tools: ToolManifest[] }) {
  return (
    <ListRows label={label}>
      {tools.map((t) => (
        <ListRow
          key={t.id}
          href={toolPath(t)}
          label={t.name}
          description={t.description}
          leading={<IconTile icon={toolGlyph(t.id)} size="sm" />}
          actions={<FavouriteToggle tool={t} size="sm" />}
        />
      ))}
    </ListRows>
  );
}

/**
 * Home's "Pick up where you left off" (redesign spec, Pages): favourite
 * tools, recent tools and autosaved workspace documents. Each list is
 * hidden while it is empty, and the whole band when all are.
 */
export function PickUp() {
  const navigate = useNavigate();
  const { ids: favIds } = useFavorites();
  const recentIds = useRecentToolsStore((s) => s.ids);
  const { docs, remove } = useRecentDocuments(4);
  const tools = getEnabledTools();
  const byId = (ids: string[]) =>
    ids.flatMap((id) => tools.filter((t) => t.id === id));
  const favourites = byId(favIds).slice(0, 6);
  const recent = byId(recentIds)
    .filter((t) => !favIds.includes(t.id))
    .slice(0, 5);
  const documents = docs ?? [];
  if (!favourites.length && !recent.length && !documents.length) return null;

  return (
    <Stack as="section" gap="5" aria-labelledby="home-pick-up">
      <Heading level={2} size="xl" id="home-pick-up">
        Pick up where you left off
      </Heading>
      <Grid minItemWidth="18rem" columns={3} gap="5">
        {favourites.length ? (
          <Card title="Favourites" headingLevel={3} padding="sm" as="section">
            <ToolRows label="Favourite tools" tools={favourites} />
          </Card>
        ) : null}
        {recent.length ? (
          <Card
            title="Recently used"
            headingLevel={3}
            padding="sm"
            as="section"
          >
            <ToolRows label="Recently used tools" tools={recent} />
          </Card>
        ) : null}
        {documents.length ? (
          <Card
            title="Recent documents"
            headingLevel={3}
            padding="sm"
            as="section"
          >
            <ListRows label="Recent documents">
              {documents.map((d) => (
                <ListRow
                  key={d.id}
                  label={d.name}
                  description={`${d.pageCount} ${d.pageCount === 1 ? 'page' : 'pages'}, ${relativeTime(d.updatedAt)}`}
                  leading={<IconTile icon={filePen} size="sm" tone="neutral" />}
                  dimmed={!d.restorable}
                  onClick={() =>
                    navigate(`/pdf/edit?doc=${encodeURIComponent(d.id)}`)
                  }
                  actions={
                    <IconButton
                      icon={trash}
                      label={`Remove ${d.name} from this device`}
                      variant="ghost"
                      tone="neutral"
                      size="sm"
                      onClick={() => void remove(d.id)}
                    />
                  }
                />
              ))}
            </ListRows>
          </Card>
        ) : null}
      </Grid>
    </Stack>
  );
}
