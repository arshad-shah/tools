import { useTheme, type ThemePreference } from '@/shared/lib/theme';
import {
  IconGithub,
  IconMonitor,
  IconMoon,
  IconSun,
  Logo,
} from '@/shared/ui/icons';
import { MetaList, SegmentedControl, StatusDot } from '@/shared/ui';
import type { ToolDefinition } from './tool';
import { getEnabledTools } from './registry';
import { formatBuildStamp, issuesUrl, REPO_URL } from './footerUtils';

const AUTHOR = 'Arshad Shah';

const linkClass =
  'inline-flex items-center gap-1.5 rounded-sm text-fg-muted transition-colors duration-fast hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-coarse:min-h-11 pointer-coarse:min-w-11';

/** Version and build info, privacy note, theme switch (spec §5.2). */
export default function Footer({ tool }: { tool?: ToolDefinition }) {
  const { preference, setPreference } = useTheme();
  const year = new Date().getFullYear();
  const toolCount = getEnabledTools().length;
  const stamp = formatBuildStamp(
    __BUILD_SHA__,
    __BUILD_DATE__,
    import.meta.env.DEV,
  );

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Logo className="h-4 self-start" />
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <StatusDot tone="accent" decorative />
              Your files are processed on this device and never uploaded.
            </p>
          </div>
          <SegmentedControl<ThemePreference>
            label="Theme"
            size="sm"
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'system', label: 'System', icon: IconMonitor },
              { value: 'light', label: 'Light', icon: IconSun },
              { value: 'dark', label: 'Dark', icon: IconMoon },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <MetaList
            items={[
              `${toolCount} tools`,
              <span key="build" data-dynamic="">
                {stamp.href && stamp.sha ? (
                  <>
                    {stamp.version}{' '}
                    <a
                      href={stamp.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Build ${stamp.sha} on GitHub`}
                      className={linkClass}
                    >
                      {stamp.sha}
                    </a>
                  </>
                ) : (
                  stamp.label
                )}
              </span>,
              `Copyright ${year} ${AUTHOR}`,
            ]}
          />
          <MetaList
            items={[
              <a
                key="source"
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View source on GitHub"
                className={linkClass}
              >
                <IconGithub size="xs" />
                source
              </a>,
              <a
                key="issues"
                href={issuesUrl(tool)}
                target="_blank"
                rel="noopener noreferrer"
                // Starts with the visible text (WCAG 2.5.3 label in name).
                aria-label={
                  tool
                    ? `issues: report a problem with ${tool.name}`
                    : 'issues: report a problem'
                }
                className={linkClass}
              >
                issues
              </a>,
            ]}
          />
        </div>
      </div>
    </footer>
  );
}
