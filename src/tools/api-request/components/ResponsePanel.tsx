import React from 'react';
import { IconSend } from '@/shared/ui/icons';

import {
  Badge,
  Box,
  Center,
  Code,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Inline,
  Spinner,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import type { ResponseTab, ResponseType } from '../types';

const statusColor = (
  status: number,
): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (status === 0) return 'danger';
  if (status >= 500) return 'danger';
  if (status >= 400) return 'warning';
  if (status >= 200 && status < 300) return 'success';
  return 'neutral';
};

interface ResponsePanelProps {
  isLoading: boolean;
  response: ResponseType | null;
  activeResponseTab: ResponseTab;
  setActiveResponseTab: (tab: ResponseTab) => void;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({
  isLoading,
  response,
  activeResponseTab,
  setActiveResponseTab,
}) => {
  if (isLoading) {
    return (
      <Center className="py-10">
        <Stack gap="3" align="center">
          <Spinner size="lg" />
          <Text size="sm" tone="subtle">
            Sending request…
          </Text>
        </Stack>
      </Center>
    );
  }
  if (!response) {
    return (
      <EmptyState>
        <EmptyStateIcon>
          <IconSend size="2xl" />
        </EmptyStateIcon>
        <EmptyStateTitle>No response yet</EmptyStateTitle>
        <EmptyStateDescription>
          Send a request to see the response here.
        </EmptyStateDescription>
      </EmptyState>
    );
  }
  return (
    <Stack gap="3">
      <Inline justify="between" align="center" wrap gap="2">
        <Inline gap="2" align="center">
          <Badge variant="solid" tone={statusColor(response.status)} size="md">
            {response.status} {response.statusText}
          </Badge>
          <Badge variant="soft" tone="neutral" size="sm">
            {response.time}ms
          </Badge>
        </Inline>
      </Inline>
      <Tabs
        value={activeResponseTab}
        onValueChange={(v) => setActiveResponseTab(v as ResponseTab)}
        variant="line"
      >
        <TabsList aria-label="Response">
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="headers">
            <Inline gap="2" align="center">
              <span>Headers</span>
              <Badge variant="soft" tone="neutral" size="xs">
                {Object.keys(response.headers).length}
              </Badge>
            </Inline>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="body">
          <Box className="pt-3">
            <Code block>
              {typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data, null, 2)}
            </Code>
          </Box>
        </TabsContent>
        <TabsContent value="headers">
          <Box className="pt-3">
            <Stack gap="1">
              {Object.entries(response.headers).map(([k, v]) => (
                <Inline key={k} justify="between" align="start" gap="2" wrap>
                  <Text size="sm" weight="medium">
                    {k}
                  </Text>
                  <Code>{v}</Code>
                </Inline>
              ))}
            </Stack>
          </Box>
        </TabsContent>
      </Tabs>
    </Stack>
  );
};
