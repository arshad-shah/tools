import React from 'react';
import { Wrench } from 'lucide-react';
import {
  Box,
  Container,
  Divider,
  Inline,
  Section,
  Stack,
  Text,
  Button,
} from '@arshad-shah/cynosure-react';
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
    <Section as="footer" space="md" paddingTop="16" paddingBottom="10">
      <Container size="xl">
        <Stack gap="8" align="center">
          <Divider />

          <Stack gap="4" align="center">
            <Inline align="center" gap="3">
              <Box
                padding="2"
                borderRadius="md"
                background="accent.soft"
                color="accent.solid"
                display="inline-flex"
              >
                <Wrench size={18} aria-hidden />
              </Box>
              <Text size="lg" weight="bold">
                Tools Dashboard
              </Text>
            </Inline>

            <Text size="sm" variant="caption" align="center">
              {toolCount} client-side utilities {DOT} no tracking {DOT} open
              source
            </Text>

            <Button
              asChild
              variant="soft"
              colorScheme="accent"
              size="sm"
              shape="pill"
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
          </Stack>

          <Inline align="center" gap="2" wrap justify="center">
            <Text size="xs" variant="caption" as="span">
              © {year} {AUTHOR}
            </Text>
            <Text size="xs" variant="caption" as="span" aria-hidden>
              {DOT}
            </Text>
            <Text size="xs" variant="caption" as="span">
              React
            </Text>
            <Text size="xs" variant="caption" as="span" aria-hidden>
              {DOT}
            </Text>
            <Text size="xs" variant="caption" as="span">
              Cynosure
            </Text>
            <Text size="xs" variant="caption" as="span" aria-hidden>
              {DOT}
            </Text>
            <Text size="xs" variant="caption" as="span">
              Vite
            </Text>
          </Inline>
        </Stack>
      </Container>
    </Section>
  );
};

export default Footer;
