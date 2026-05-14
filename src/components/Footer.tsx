import React from 'react';
import { Github, Wrench } from 'lucide-react';
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
              leftIcon={<Github size={14} />}
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
