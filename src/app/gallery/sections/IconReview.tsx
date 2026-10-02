import type { IconComponent, IconSize } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';
import { Heading, Stack } from '@/shared/ui';

const SIZES: IconSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

/** Each custom icon on the three grounds it ships on (plan G-1). */
const GROUNDS = [
  { name: 'surface', className: 'bg-surface text-fg' },
  { name: 'surface-2', className: 'bg-surface-2 text-fg' },
  { name: 'accent', className: 'bg-accent text-accent-ink' },
] as const;

const modules = import.meta.glob<Record<string, unknown>>(
  '/src/shared/ui/icons/custom/*.tsx',
  { eager: true },
);

/** Custom icons grouped by their `custom/<group>.tsx` file, sorted by group. */
const CUSTOM_ICON_GROUPS: [string, [string, IconComponent][]][] =
  Object.entries(modules)
    .map(
      ([path, mod]) =>
        [
          path.replace(/^.*\/(.+)\.tsx$/, '$1'),
          Object.entries(mod).filter(
            ([name, v]) =>
              /^(Icon|Key)[A-Z]/.test(name) && typeof v === 'function',
          ) as [string, IconComponent][],
        ] as [string, [string, IconComponent][]],
    )
    .filter(([, icons]) => icons.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

function IconRow({ name, Icon }: { name: string; Icon: IconComponent }) {
  return (
    <li className="flex flex-col gap-1.5">
      <span className="font-mono-meta text-xs text-fg-muted">{name}</span>
      <span className="flex flex-wrap gap-1.5">
        {GROUNDS.map((g) => (
          <span
            key={g.name}
            title={g.name}
            className={cn(
              'flex items-end gap-2 rounded-md p-2 shadow-e1',
              g.className,
            )}
          >
            {SIZES.map((s) => (
              <Icon key={s} size={s} />
            ))}
          </span>
        ))}
      </span>
    </li>
  );
}

/** One screenshot target per custom icon group. */
export function IconReview() {
  return (
    <Stack gap="4">
      {CUSTOM_ICON_GROUPS.map(([group, icons]) => (
        <section
          key={group}
          data-testid={`kit-icon-group-${group}`}
          aria-labelledby={`kit-icon-group-${group}`}
          className="rounded-lg bg-canvas p-3"
        >
          <Stack gap="2">
            <Heading level={3} size="sm" id={`kit-icon-group-${group}`}>
              {`custom/${group}`}
            </Heading>
            <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(26rem,1fr))] gap-3">
              {icons.map(([name, Icon]) => (
                <IconRow key={name} name={name} Icon={Icon} />
              ))}
            </ul>
          </Stack>
        </section>
      ))}
    </Stack>
  );
}
