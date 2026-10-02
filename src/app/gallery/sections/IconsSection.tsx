import * as Icons from '@/shared/ui/icons';
import type { IconComponent, IconSize } from '@/shared/ui/icons';
import { Logo, LogoMark } from '@/shared/ui/icons';
import { Row, Section } from '../Section';

const SIZES: IconSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

const ICONS = Object.entries(Icons)
  .filter(
    ([name, value]) =>
      /^(Icon|Key)[A-Z]/.test(name) && typeof value === 'function',
  )
  .sort(([a], [b]) => a.localeCompare(b)) as [string, IconComponent][];

/** Every icon at every size, captioned by its export name. */
export function IconsSection() {
  return (
    <Section name="icons" title="Icons">
      <Row label="Logo, LogoMark">
        <span className="text-fg">
          <Logo animateCaret={false} className="h-8" />
        </span>
        <span className="text-fg">
          <Logo variant="mono" animateCaret={false} className="h-8" />
        </span>
        <LogoMark size="xl" label="tools mark" />
        <LogoMark size="md" />
      </Row>
      <Row label="Illustration sizes 2xl and 3xl (empty states)">
        {[Icons.IconFileText, Icons.IconSearch, Icons.IconHistory].map(
          (Icon) => (
            <span
              key={Icon.displayName}
              className="flex items-end gap-3 text-fg"
            >
              <Icon size="2xl" />
              <Icon size="3xl" />
            </span>
          ),
        )}
      </Row>
      <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-2">
        {ICONS.map(([name, Icon]) => (
          <li
            key={name}
            className="flex flex-col gap-2 rounded-md bg-surface p-2 text-fg shadow-e1"
          >
            <span className="flex items-end gap-2">
              {SIZES.map((s) => (
                <Icon key={s} size={s} />
              ))}
            </span>
            <span className="truncate font-mono-meta text-xs text-fg-muted">
              {name}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
