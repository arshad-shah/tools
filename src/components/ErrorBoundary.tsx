import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, Home, RefreshCw, X } from 'lucide-react';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Code,
  Container,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDismissed: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDismissed: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleDismiss = (): void => {
    this.setState({ isDismissed: true });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && !this.state.isDismissed) {
      const { error, errorInfo } = this.state;

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Center style={{ minHeight: '100vh', padding: 'var(--cyn-space-6, 1.5rem)' }}>
          <Container size="md">
            <Card variant="elevated" size="lg">
              <CardHeader>
                <Alert status="danger" variant="soft" icon={<AlertTriangle aria-hidden />}>
                  <AlertTitle>Application Error Detected</AlertTitle>
                  <AlertDescription>
                    Something went wrong in the application. Our engineers have
                    been notified.
                  </AlertDescription>
                </Alert>
              </CardHeader>
              <CardBody>
                <Stack gap="4">
                  <Stack gap="2">
                    <Text size="sm" weight="semibold">
                      Error details
                    </Text>
                    <Box
                      style={{
                        padding: 'var(--cyn-space-3, 0.75rem)',
                        borderRadius: 'var(--cyn-radius-md, 0.5rem)',
                        background: 'var(--cyn-color-bg-muted, rgba(0,0,0,0.2))',
                        overflowX: 'auto',
                      }}
                    >
                      <Code size="sm">
                        {error?.name}: {error?.message}
                      </Code>
                    </Box>
                  </Stack>
                  {import.meta.env.DEV && errorInfo && (
                    <details>
                      <summary
                        style={{
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 'var(--cyn-font-size-sm, 0.875rem)',
                        }}
                      >
                        Stack trace (development only)
                      </summary>
                      <Box
                        style={{
                          marginTop: 'var(--cyn-space-2, 0.5rem)',
                          padding: 'var(--cyn-space-3, 0.75rem)',
                          borderRadius: 'var(--cyn-radius-md, 0.5rem)',
                          background: 'var(--cyn-color-bg-muted, rgba(0,0,0,0.2))',
                          maxHeight: '15rem',
                          overflow: 'auto',
                        }}
                      >
                        <Code size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {errorInfo.componentStack || 'No stack trace available'}
                        </Code>
                      </Box>
                    </details>
                  )}
                </Stack>
              </CardBody>
              <CardFooter>
                <Inline gap="2" wrap justify="end">
                  <Button
                    variant="ghost"
                    colorScheme="neutral"
                    leftIcon={<X size={16} />}
                    onClick={this.handleDismiss}
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="soft"
                    colorScheme="neutral"
                    leftIcon={<Home size={16} />}
                    onClick={this.handleGoHome}
                  >
                    Go to dashboard
                  </Button>
                  <Button
                    variant="solid"
                    colorScheme="accent"
                    leftIcon={<RefreshCw size={16} />}
                    onClick={this.handleReload}
                  >
                    Reload application
                  </Button>
                </Inline>
              </CardFooter>
            </Card>
          </Container>
        </Center>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
