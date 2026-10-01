import React from 'react';
import { Container, Section, Inline, Text } from '@/shared/ui';
import type { ToolDefinition } from './tool';
import { getEnabledTools } from './registry';
import { formatBuildStamp, issuesUrl, REPO_URL } from './footerUtils';

const AUTHOR = 'Arshad Shah';
const DOT = '·';

const linkClass =
  'inline-flex items-center gap-1.5 rounded-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

// GitHub is a brand mark and is intentionally not part of the icon set
// (lucide v1 dropped brand glyphs), so it ships as an inline SVG.
const GithubIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.62 8.21 11.18.6.11.82-.25.82-.56v-2.1c-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.21 1.84 1.21 1.07 1.79 2.81 1.27 3.5.97.11-.76.42-1.27.76-1.56-2.67-.3-5.47-1.3-5.47-5.79 0-1.28.47-2.32 1.24-3.14-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.2a11.6 11.6 0 0 1 6 0c2.29-1.52 3.3-1.2 3.3-1.2.66 1.65.24 2.87.12 3.17.77.82 1.24 1.86 1.24 3.14 0 4.5-2.81 5.48-5.49 5.78.43.36.81 1.08.81 2.18v3.23c0 .31.22.68.83.56A12.02 12.02 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
  </svg>
);

const Sep: React.FC = () => (
  <span aria-hidden className="text-fg-faint">
    {DOT}
  </span>
);

const Footer: React.FC<{ tool?: ToolDefinition }> = ({ tool }) => {
  const year = new Date().getFullYear();
  const toolCount = getEnabledTools().length;
  const stamp = formatBuildStamp(
    __BUILD_SHA__,
    __BUILD_DATE__,
    import.meta.env.DEV,
  );

  return (
    <Section as="footer" className="border-t border-line py-4">
      <Container size="xl">
        <Text
          as="div"
          mono
          size="xs"
          tone="muted"
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
        >
          <Inline gap="3" wrap>
            <span className="inline-flex items-baseline gap-1.5 font-bold text-fg">
              <span>
                <span className="text-fg-faint">~/</span>tools
              </span>
              <span
                aria-hidden
                className="inline-block h-3 w-1.5 animate-caret bg-accent"
              />
            </span>
            <Sep />
            <span>{toolCount} tools</span>
            <Sep />
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full bg-success"
              />
              runs locally, no uploads
            </span>
            <Sep />
            {stamp.href && stamp.sha ? (
              <span>
                {stamp.version} {DOT}{' '}
                <a
                  href={stamp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Build ${stamp.sha} on GitHub`}
                  className={linkClass}
                >
                  {stamp.sha}
                </a>
              </span>
            ) : (
              <span>{stamp.label}</span>
            )}
          </Inline>

          <Inline gap="3" wrap>
            <span>
              © {year} {AUTHOR}
            </span>
            <Sep />
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className={linkClass}
            >
              <GithubIcon />
              source
            </a>
            <Sep />
            <a
              href={issuesUrl(tool)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                tool ? `Report an issue with ${tool.name}` : 'Report an issue'
              }
              className={linkClass}
            >
              issues
            </a>
          </Inline>
        </Text>
      </Container>
    </Section>
  );
};

export default Footer;
