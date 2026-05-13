import React, { useEffect, useState } from 'react';
import { Center, Spinner, Stack, Text } from '@arshad-shah/cynosure-react';

interface LoadingFallbackProps {
  toolName?: string;
  delay?: number;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  toolName,
  delay = 300,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <Center paddingY="10">
      <Stack gap="4" align="center">
        <Spinner size="xl" colorScheme="accent" variant="border" />
        <Text size="md" weight="medium">
          {toolName ? `Loading ${toolName}…` : 'Loading…'}
        </Text>
      </Stack>
    </Center>
  );
};

export default LoadingFallback;
