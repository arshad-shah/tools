import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, Home, RefreshCw, X } from 'lucide-react';
import {
  Alert,
  AlertTitle,
  AlertDescription,
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
        <Center minHeight="screen" padding="6">
          <Container size="md">
            <Card variant="elevated" size="lg">
              <CardHeader>
                <Alert
                  status="danger"
                  variant="soft"
                  icon={<AlertTriangle aria-hidden />}
                >
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
                    <Card variant="filled" size="sm">
                      <CardBody>
                        <Code size="sm">
                          {error?.name}: {error?.message}
                        </Code>
                      </CardBody>
                    </Card>
                  </Stack>
                  {import.meta.env.DEV && errorInfo && (
                    <Stack gap="2">
                      <Text size="sm" weight="semibold">
                        Stack trace (development only)
                      </Text>
                      <Card variant="filled" size="sm">
                        <CardBody>
                          <Code size="sm">
                            {errorInfo.componentStack ||
                              'No stack trace available'}
                          </Code>
                        </CardBody>
                      </Card>
                    </Stack>
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
