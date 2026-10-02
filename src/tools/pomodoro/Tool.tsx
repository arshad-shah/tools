import React, { useState } from 'react';
import { IconMenu } from '@/shared/ui/icons';
import { Box, Button, Center, Container, Inline, Stack } from '@/shared/ui';
import { MenuDrawer } from './components/MenuDrawer';
import { TimerCard } from './components/TimerCard';

// The store hydrates synchronously from localStorage: no provider or gate.
const Pomodoro: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Container size="md">
      <Stack gap="4">
        <Inline justify="end">
          <Button
            variant="soft"
            size="sm"
            leftIcon={<IconMenu size="sm" />}
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </Button>
        </Inline>
        <Center>
          <Box className="w-full">
            <TimerCard />
          </Box>
        </Center>
      </Stack>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </Container>
  );
};

export default Pomodoro;
