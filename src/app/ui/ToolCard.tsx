import {
  Badge,
  Card,
  Heading,
  HighlightedText,
  IconButton,
  IconTile,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import type { IconData } from '@arshad-shah/cynosure/icons';
import { star } from '@arshad-shah/cynosure/icons';
import { useFavorites } from '../favorites';
import { toolPath } from '../routes';
import type { ToolManifest } from '../tool';

export interface FavouriteToggleProps {
  tool: Pick<ToolManifest, 'id' | 'name'>;
  size?: 'sm' | 'md';
}

/** Star or unstar a tool (aria-pressed says which it is). */
export function FavouriteToggle({ tool, size = 'md' }: FavouriteToggleProps) {
  const { isFavorite, toggle } = useFavorites();
  const on = isFavorite(tool.id);
  return (
    <IconButton
      icon={star}
      label={`Add ${tool.name} to favourites`}
      aria-pressed={on}
      variant={on ? 'soft' : 'ghost'}
      tone={on ? 'accent' : 'neutral'}
      size={size}
      onClick={() => toggle(tool.id)}
    />
  );
}

export interface LinkCardProps {
  href: string;
  icon: IconData;
  title: string;
  description: string;
  /** Words to mark in the title (Home's live search). */
  query?: string;
  badge?: string;
  actions?: React.ReactNode;
}

/** A card that is one link: an icon tile, a name and one line about it. */
export function LinkCard({
  href,
  icon,
  title,
  description,
  query,
  badge,
  actions,
}: LinkCardProps) {
  return (
    <Card href={href} padding="md" actions={actions}>
      <Stack gap="4">
        <Inline gap="4" align="center">
          <IconTile icon={icon} />
          {badge ? (
            <Badge size="sm" tone="accent">
              {badge}
            </Badge>
          ) : null}
        </Inline>
        <Stack gap="2">
          <Heading level={3} size="sm">
            {query ? <HighlightedText text={title} query={query} /> : title}
          </Heading>
          <Text size="sm" tone="muted" truncate={2}>
            {description}
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
}

/** A tool's card: the whole card opens the tool; the star sits on it. */
export function ToolCard({
  tool,
  query,
  tag,
}: {
  tool: ToolManifest;
  query?: string;
  /** Shown for a tool listed from another category. */
  tag?: string;
}) {
  return (
    <LinkCard
      href={toolPath(tool)}
      icon={tool.icon}
      title={tool.name}
      description={tool.description}
      query={query}
      badge={tool.isNew ? 'New' : tag}
      actions={<FavouriteToggle tool={tool} size="sm" />}
    />
  );
}
