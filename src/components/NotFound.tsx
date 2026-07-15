import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Center, Container, Stack, Inline, Text, Button } from './ui';

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
    <Center minScreen>
      <Container size="md">
        <Stack gap="6" align="center">
          {/* Terminal error line */}
          <div className="w-full rounded-lg border border-line bg-surface p-6 font-mono">
            <Text mono size="sm" tone="faint">
              <span className="text-accent">$</span> cd /tool
            </Text>
            <Text mono size="sm" tone="muted" className="mt-2">
              <span className="text-danger">error:</span> route not found{' '}
              <span className="text-fg">(404)</span>
            </Text>
            <Text mono size="sm" tone="muted" className="mt-1">
              no such tool in this directory.
            </Text>
            <Text mono size="sm" tone="subtle" className="mt-4">
              returning to <span className="text-accent">~/tools</span> in{' '}
              {count}s
              <span
                aria-hidden
                className="ml-1 inline-block h-4 w-2 animate-caret bg-accent align-middle"
              />
            </Text>
          </div>

          <Inline gap="3" wrap justify="center">
            <Button
              variant="soft"
              leftIcon={<ArrowLeft size={16} />}
              onClick={() => navigate(-1)}
            >
              Go back
            </Button>
            <Button
              variant="solid"
              leftIcon={<Home size={16} />}
              onClick={() => navigate('/')}
            >
              {count > 0 ? `Return home in ${count}s` : 'Return home'}
            </Button>
          </Inline>
        </Stack>
      </Container>
    </Center>
  );
};

export default NotFound;
