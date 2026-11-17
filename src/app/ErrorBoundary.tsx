import {
  Button,
  CodeBlock,
  Container,
  ErrorBoundary as CyErrorBoundary,
  Inline,
  Notice,
  Stack,
} from '@arshad-shah/cynosure';
import { home, retry as retryIcon } from '@arshad-shah/cynosure/icons';
import type { ReactNode } from 'react';

/**
 * The app's last line of defence: when the shell itself fails, a danger
 * Notice with the error, a reload and a way home (tool pages have their own
 * boundary in ToolPage). The component stack shows in development only.
 */
export default function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <CyErrorBoundary
      label="tools"
      onError={(error, info) =>
        console.error('Error caught by ErrorBoundary:', error, info)
      }
      fallback={(error) => (
        <Container size="md" paddingBlock="10">
          <Stack gap="6">
            <Notice
              tone="danger"
              title="Something went wrong"
              action={
                <Inline gap="2" wrap>
                  <Button
                    size="sm"
                    variant="soft"
                    tone="danger"
                    icon={retryIcon}
                    onClick={() => window.location.reload()}
                  >
                    Reload
                  </Button>
                  <Button size="sm" variant="ghost" href="/" icon={home}>
                    Go to Home
                  </Button>
                </Inline>
              }
            >
              {error.message || 'The page could not be shown.'} Your files have
              not left this device.
            </Notice>
            {import.meta.env.DEV && error.stack ? (
              <CodeBlock code={error.stack} title="Stack trace" wrap />
            ) : null}
          </Stack>
        </Container>
      )}
    >
      {children}
    </CyErrorBoundary>
  );
}
