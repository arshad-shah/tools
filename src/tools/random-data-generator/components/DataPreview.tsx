import React from 'react';
import { IconCode, IconDownload } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Code,
  IconButton,
  Inline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import { flattenData, getAllHeaders } from '../lib/generate';
import type { GeneratedDataItem } from '../types';

interface DataPreviewProps {
  generatedData: GeneratedDataItem[] | null;
  view: 'table' | 'json';
  setView: (view: 'table' | 'json') => void;
  onDownload: () => void;
}

export const DataPreview: React.FC<DataPreviewProps> = ({
  generatedData,
  view,
  setView,
  onDownload,
}) => {
  const flattenedData = generatedData ? flattenData(generatedData) : [];
  const headers = generatedData ? getAllHeaders(flattenedData) : [];

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <CardTitle as="h3">Generated data</CardTitle>
          <Inline gap="2">
            <IconButton
              variant={view === 'json' ? 'solid' : 'soft'}
              size="sm"
              label="Toggle JSON view"
              icon={<IconCode size="sm" />}
              onClick={() => setView(view === 'json' ? 'table' : 'json')}
            />
            <IconButton
              variant="soft"
              size="sm"
              label="Download JSON"
              icon={<IconDownload size="sm" />}
              disabled={!generatedData}
              onClick={onDownload}
            />
          </Inline>
        </Inline>
      </CardHeader>
      <CardBody>
        {!generatedData ? (
          <Center className="py-10">
            <Stack gap="2" align="center">
              <IconDownload size="2xl" />
              <Text size="sm" tone="subtle" className="text-center">
                No data generated yet. Define your schema and click Generate.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as 'table' | 'json')}
            variant="line"
          >
            <TabsList aria-label="View">
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <Box className="pt-3">
                <Stack gap="2">
                  <Alert status="info">
                    <AlertDescription>
                      Complex nested objects are shown as simplified strings in
                      table view. Switch to JSON for full structure.
                    </AlertDescription>
                  </Alert>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHead key={h}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flattenedData.map((item, idx) => (
                        <TableRow key={idx}>
                          {headers.map((h) => (
                            <TableCell key={h}>
                              {item[h] !== undefined
                                ? typeof item[h] === 'boolean'
                                  ? item[h]
                                    ? 'true'
                                    : 'false'
                                  : String(item[h])
                                : ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              </Box>
            </TabsContent>

            <TabsContent value="json">
              <Box className="pt-3">
                <Code block>{JSON.stringify(generatedData, null, 2)}</Code>
              </Box>
            </TabsContent>
          </Tabs>
        )}
      </CardBody>
    </Card>
  );
};
