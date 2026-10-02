import React from 'react';
import { IconList, IconNetwork } from '@/shared/ui/icons';

import {
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  Center,
  Heading,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import { TreeView } from './TreeView';
import { DataFlow } from './treeview/DataFlow';
import type { FormatType, ParsedData, ViewMode } from '../types';

interface ViewerPaneProps {
  parsedData: ParsedData | null;
  format: FormatType;
  viewMode: ViewMode;
  searchTerm: string;
}

export const ViewerPane: React.FC<ViewerPaneProps> = ({
  parsedData,
  format,
  viewMode,
  searchTerm,
}) => {
  const renderViewerBody = () => {
    if (!parsedData) {
      return (
        <Center className="py-10">
          <Stack gap="2" align="center">
            <Heading level={3} size="md">
              No data to display
            </Heading>
            <Text size="sm" tone="subtle">
              Enter some {format.toUpperCase()} above and click Parse to
              visualise.
            </Text>
          </Stack>
        </Center>
      );
    }
    return viewMode === 'tree' ? (
      <TreeView data={parsedData} searchTerm={searchTerm} />
    ) : (
      <DataFlow initialData={parsedData} />
    );
  };

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline align="center" gap="2">
            {viewMode === 'tree' ? (
              <IconList size="sm" />
            ) : (
              <IconNetwork size="sm" />
            )}
            <Heading level={3} size="md">
              {viewMode === 'tree' ? 'Tree view' : 'Network view'}
            </Heading>
          </Inline>
          {searchTerm && (
            <Badge variant="soft" tone="accent" size="sm">
              Filtering: {searchTerm}
            </Badge>
          )}
        </Inline>
      </CardHeader>
      <CardBody>
        {viewMode === 'network' ? (
          <Box className="h-[40rem] overflow-hidden">{renderViewerBody()}</Box>
        ) : (
          <Box className="h-[40rem] overflow-auto">{renderViewerBody()}</Box>
        )}
      </CardBody>
    </Card>
  );
};
