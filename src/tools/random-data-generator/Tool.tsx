import React, { useState } from 'react';
import { IconPlusCircle, IconRefreshCw } from '@/shared/ui/icons';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Container,
  Grid,
  Label,
  NumberInput,
  Stack,
} from '@/shared/ui';
import { saveBlob } from '@/shared/lib/download';
import { DataPreview } from './components/DataPreview';
import { FieldEditor } from './components/FieldEditor';
import { defaultSchema } from './lib/field-types';
import { dataToJsonBlob, generateData } from './lib/generate';
import {
  addField,
  moveField,
  removeField,
  updateField,
  withIds,
} from './lib/schema';
import type { FieldSchema, GeneratedDataItem } from './types';

const RandomDataGenerator: React.FC = () => {
  const [schema, setSchema] = useState<FieldSchema[]>(() =>
    withIds(defaultSchema),
  );
  const [count, setCount] = useState<number>(5);
  const [generatedData, setGeneratedData] = useState<
    GeneratedDataItem[] | null
  >(null);
  const [view, setView] = useState<'table' | 'json'>('table');
  const [expandedFields, setExpandedFields] = useState<{
    [key: string]: boolean;
  }>(() => {
    // Keyed by field id; the default "address" object starts expanded.
    const address = schema.find((f) => f.name === 'address');
    return address?.id ? { [address.id]: true } : {};
  });

  const toggleExpanded = (path: string) =>
    setExpandedFields((prev) => ({ ...prev, [path]: !prev[path] }));

  const handleAddField = (parentPath: string = '') =>
    setSchema(addField(schema, parentPath));
  const handleRemoveField = (path: string) =>
    setSchema(removeField(schema, path));
  const handleUpdateField = (
    path: string,
    updatedField: Partial<FieldSchema>,
  ) => setSchema(updateField(schema, path, updatedField));
  const handleMoveField = (path: string, direction: 'up' | 'down') =>
    setSchema(moveField(schema, path, direction));

  const handleGenerate = () => {
    setGeneratedData(generateData(schema, count));
  };

  const handleDownload = () => {
    if (!generatedData) return;
    saveBlob(dataToJsonBlob(generatedData), 'generated-data.json');
  };

  return (
    <Container size="full">
      <Grid max={2} gap="4">
        <Card>
          <CardHeader>
            <CardTitle as="h3">Schema definition</CardTitle>
          </CardHeader>
          <CardBody>
            <Stack gap="4">
              <Stack gap="3">
                {schema.map((field, index) => (
                  <FieldEditor
                    key={field.id ?? index}
                    field={field}
                    index={index}
                    parentPath=""
                    level={0}
                    expandedFields={expandedFields}
                    onRemoveField={handleRemoveField}
                    onUpdateField={handleUpdateField}
                    onMoveField={handleMoveField}
                    onToggleExpanded={toggleExpanded}
                    onAddField={handleAddField}
                    totalFields={schema.length}
                  />
                ))}
                <Button
                  variant="secondary"
                  leftIcon={<IconPlusCircle size="sm" />}
                  onClick={() => handleAddField()}
                  fullWidth
                >
                  Add new field
                </Button>
              </Stack>

              <Card>
                <CardBody>
                  <Stack gap="3">
                    <Stack gap="2">
                      <Label htmlFor="gen-count">
                        Number of items to generate
                      </Label>
                      <NumberInput
                        id="gen-count"
                        value={count}
                        onValueChange={(v) => setCount(Math.max(1, v ?? 1))}
                        min={1}
                        aria-label="Item count"
                      />
                    </Stack>
                    <Button
                      variant="primary"
                      leftIcon={<IconRefreshCw size="sm" />}
                      onClick={handleGenerate}
                      fullWidth
                    >
                      Generate random data
                    </Button>
                  </Stack>
                </CardBody>
              </Card>
            </Stack>
          </CardBody>
        </Card>

        <DataPreview
          generatedData={generatedData}
          view={view}
          setView={setView}
          onDownload={handleDownload}
        />
      </Grid>
    </Container>
  );
};

export default RandomDataGenerator;
