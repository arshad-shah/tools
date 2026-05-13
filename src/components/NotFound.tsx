import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Compass } from 'lucide-react';
import {
  Center,
  Container,
  Stack,
  Inline,
  Heading,
  Text,
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateActions,
} from '@arshad-shah/cynosure-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count <= 0) {
      navigate('/');
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, navigate]);

  return (
    <Center minHeight="screen">
      <Container size="md">
        <Stack gap="6" align="center">
          <Heading level={1} size="5xl" weight="bold" align="center">
            404
          </Heading>
          <EmptyState size="lg" variant="subtle">
            <EmptyStateIcon>
              <Compass size={48} aria-hidden />
            </EmptyStateIcon>
            <EmptyStateTitle>Houston, we have a problem</EmptyStateTitle>
            <EmptyStateDescription>
              The tool you&apos;re looking for has vanished into the digital
              void. Perhaps it was never there, or perhaps it&apos;s just
              hiding really well.
            </EmptyStateDescription>
            <EmptyStateActions>
              <Inline gap="3" wrap justify="center">
                <Button
                  variant="soft"
                  colorScheme="neutral"
                  leftIcon={<ArrowLeft size={16} />}
                  onClick={() => navigate(-1)}
                >
                  Go back
                </Button>
                <Button
                  variant="solid"
                  colorScheme="accent"
                  leftIcon={<Home size={16} />}
                  onClick={() => navigate('/')}
                >
                  {count > 0 ? `Return home in ${count}s` : 'Return home'}
                </Button>
              </Inline>
            </EmptyStateActions>
          </EmptyState>
          <Text size="sm" variant="caption">
            Lost? Head back to the dashboard.
          </Text>
        </Stack>
      </Container>
    </Center>
  );
};

export default NotFound;
