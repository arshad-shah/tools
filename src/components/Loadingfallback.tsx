import React, { useEffect, useState } from 'react';
import { Center, Spinner, Stack, Text } from './ui';

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
    <Center className="py-10">
      <Stack gap="4" align="center">
        <Spinner size="xl" />
        <Text size="md" weight="medium" mono>
          {toolName ? `Loading ${toolName}…` : 'Loading…'}
        </Text>
      </Stack>
    </Center>
  );
};

export default LoadingFallback;
