import React, { Component, ErrorInfo } from 'react';
import { RefreshCw, Home, AlertCircle } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Code,
  Inline,
  Kbd,
  Stack,
  Text,
} from './ui';

interface Props {
  children: React.ReactNode;
  toolName: string;
  toolId: string;
  onRetry?: () => void;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ToolErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error(`Error in tool ${this.props.toolId}:`, error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  handleNavigateHome = (): void => {
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    const { error } = this.state;
    const { toolName, toolId } = this.props;

    return (
      <Stack gap="4">
        <Card>
          <CardHeader>
            <Alert status="danger" icon={<AlertCircle size={18} aria-hidden />}>
              <AlertTitle>{toolName} encountered an error</AlertTitle>
              <AlertDescription>
                We hit an unexpected issue while running this tool. You can try
                again or head back to the dashboard.
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardBody>
            <Stack gap="3">
              <Text size="sm" weight="semibold">
                Error details
              </Text>
              <Code block>{error?.message || 'Unknown error occurred'}</Code>
              <Inline gap="2" align="center">
                <Text size="xs" tone="subtle">
                  Tool ID:
                </Text>
                <Kbd>{toolId}</Kbd>
              </Inline>
            </Stack>
          </CardBody>
          <CardFooter>
            <Inline gap="2" wrap justify="end">
              <Button
                variant="soft"
                leftIcon={<Home size={16} />}
                onClick={this.handleNavigateHome}
              >
                Go to dashboard
              </Button>
              <Button
                variant="solid"
                leftIcon={<RefreshCw size={16} />}
                onClick={this.handleRetry}
              >
                Retry {toolName}
              </Button>
            </Inline>
          </CardFooter>
        </Card>

        {import.meta.env.DEV && (
          <Card>
            <CardBody>
              <Stack gap="2">
                <Text size="sm" weight="semibold">
                  Technical details (development only)
                </Text>
                <Code block>
                  {JSON.stringify(
                    {
                      toolId,
                      errorName: this.state.error?.name,
                      errorMessage: this.state.error?.message,
                      stack: this.state.error?.stack?.split('\n'),
                    },
                    null,
                    2,
                  )}
                </Code>
              </Stack>
            </CardBody>
          </Card>
        )}
      </Stack>
    );
  }
}

export default ToolErrorBoundary;
