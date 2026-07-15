import React from 'react';
import { Container, Section, Stack, Inline, Text, Button, Divider } from './ui';
import { getEnabledTools } from '../data/ToolDefinitions';

const REPO_URL = 'https://github.com/arshad-shah/tools';
const AUTHOR = 'Arshad Shah';
const DOT = '·';

// GitHub is a brand mark and is intentionally not part of the icon set
// (lucide v1 dropped brand glyphs), so it ships as an inline SVG.
const GithubIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
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

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const toolCount = getEnabledTools().length;

  return (
    <Section as="footer" className="pb-10 pt-16">
      <Container size="xl">
        <Stack gap="6" align="center">
          <Divider />

          <Inline gap="2" align="baseline">
            <span className="font-mono text-lg font-bold text-fg">
              <span className="text-fg-faint">~/</span>tools
            </span>
            <span
              aria-hidden
              className="inline-block h-4 w-2 animate-caret bg-accent"
            />
          </Inline>

          <Text mono size="sm" tone="muted" className="text-center">
            {toolCount} client-side utilities {DOT} no tracking {DOT} open
            source
          </Text>

          <Button
            asChild
            variant="soft"
            size="sm"
            leftIcon={<GithubIcon size={14} />}
          >
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
            >
              View on GitHub
            </a>
          </Button>

          <Inline gap="2" wrap justify="center">
            {[`© ${year} ${AUTHOR}`, 'React', 'Tailwind', 'Vite'].map(
              (item, i, arr) => (
                <React.Fragment key={item}>
                  <span className="font-mono text-xs text-fg-subtle">
                    {item}
                  </span>
                  {i < arr.length - 1 && (
                    <span
                      className="font-mono text-xs text-fg-faint"
                      aria-hidden
                    >
                      {DOT}
                    </span>
                  )}
                </React.Fragment>
              ),
            )}
          </Inline>
        </Stack>
      </Container>
    </Section>
  );
};

export default Footer;
