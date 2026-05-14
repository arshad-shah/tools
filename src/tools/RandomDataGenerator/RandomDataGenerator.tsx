import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Code as CodeIcon,
  Download,
  Plus,
  PlusCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Checkbox,
  Code,
  Container,
  Grid,
  IconButton,
  Inline,
  Label,
  NumberInput,
  Select,
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
} from '@arshad-shah/cynosure-react';
import * as DataUtils from './utils';
import {
  FieldSchema,
  GeneratedDataItem,
} from '../../types/RandomDataGeneratorTypes';

interface FieldEditorProps {
  field: FieldSchema;
  path: string;
  index: number;
  parentPath: string;
  level: number;
  expandedFields: { [key: string]: boolean };
  totalFields: number;
  onRemoveField: (path: string) => void;
  onUpdateField: (path: string, updatedField: Partial<FieldSchema>) => void;
  onMoveField: (path: string, direction: 'up' | 'down') => void;
  onToggleExpanded: (path: string) => void;
  onAddField: (parentPath?: string) => void;
}

const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  path,
  index,
  parentPath,
  level,
  expandedFields,
  totalFields,
  onRemoveField,
  onUpdateField,
  onMoveField,
  onToggleExpanded,
  onAddField,
}) => {
  const isObject = field.type === 'object';
  const isArray = field.type === 'array';
  const isNested = isObject || isArray;
  const fullPath = parentPath ? `${parentPath}.${index}` : `${index}`;
  const isExpanded = expandedFields[path] || false;

  return (
    <Card variant="outlined" size="sm">
      <CardBody>
        <Stack gap="3">
          <Inline justify="between" align="center" gap="2" wrap>
            <Inline align="center" gap="2" wrap>
              {isNested && (
                <IconButton
                  variant="ghost"
                  colorScheme="neutral"
                  size="sm"
                  label={isExpanded ? 'Collapse field' : 'Expand field'}
                  icon={
                    isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )
                  }
                  onClick={() => onToggleExpanded(path)}
                />
              )}
              <Badge variant="soft" colorScheme="accent" size="sm">
                #{index + 1}
              </Badge>
              <Box minWidth="0">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) =>
                    onUpdateField(fullPath, { name: e.target.value })
                  }
                  placeholder="Field name"
                  aria-label="Field name"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    font: 'inherit',
                    color: 'inherit',
                    width: '100%',
                  }}
                />
              </Box>
            </Inline>
            <Inline gap="1">
              {level === 0 && (
                <>
                  <IconButton
                    variant="ghost"
                    colorScheme="neutral"
                    size="sm"
                    label="Move up"
                    icon={<ArrowUp size={14} />}
                    disabled={index === 0}
                    onClick={() => onMoveField(`${index}`, 'up')}
                  />
                  <IconButton
                    variant="ghost"
                    colorScheme="neutral"
                    size="sm"
                    label="Move down"
                    icon={<ArrowDown size={14} />}
                    disabled={index === totalFields - 1}
                    onClick={() => onMoveField(`${index}`, 'down')}
                  />
                </>
              )}
              <IconButton
                variant="ghost"
                colorScheme="danger"
                size="sm"
                label="Remove field"
                icon={<Trash2 size={14} />}
                onClick={() => onRemoveField(fullPath)}
              />
            </Inline>
          </Inline>

          <Grid columns={{ base: 1, md: 2 }} gap="3">
            <Stack gap="2">
              <Label>Data type</Label>
              <Select
                value={field.type}
                onValueChange={(v) => onUpdateField(fullPath, { type: v })}
                items={DataUtils.fieldTypes.map((t) => ({
                  value: t.value,
                  label: t.label,
                }))}
                aria-label="Data type"
              />
            </Stack>

            {field.type === 'number' && (
              <Inline gap="2">
                <Stack gap="2" flex="1">
                  <Label>Min</Label>
                  <NumberInput
                    value={field.min ?? 0}
                    onChange={(v) =>
                      onUpdateField(fullPath, { min: v ?? 0 })
                    }
                    aria-label="Minimum value"
                  />
                </Stack>
                <Stack gap="2" flex="1">
                  <Label>Max</Label>
                  <NumberInput
                    value={field.max ?? 100}
                    onChange={(v) =>
                      onUpdateField(fullPath, { max: v ?? 100 })
                    }
                    aria-label="Maximum value"
                  />
                </Stack>
              </Inline>
            )}

            {field.type === 'array' && (
              <Stack gap="2">
                <Label>Array size</Label>
                <NumberInput
                  value={field.arraySize ?? 3}
                  onChange={(v) =>
                    onUpdateField(fullPath, { arraySize: v ?? 3 })
                  }
                  minValue={1}
                  maxValue={20}
                  aria-label="Array size"
                />
              </Stack>
            )}

            <Inline align="center" gap="2">
              <Checkbox
                checked={field.required || false}
                onCheckedChange={(c) =>
                  onUpdateField(fullPath, { required: Boolean(c) })
                }
                aria-label="Required field"
              />
              <Label>Required field</Label>
            </Inline>
          </Grid>

          <Text size="xs" variant="caption" italic>
            {DataUtils.fieldDescriptions[field.type] ||
              'Field type description not available'}
          </Text>

          {isNested && isExpanded && (
            <Stack gap="3" paddingLeft="4">
              {field.fields?.map((nestedField, nestedIndex) => (
                <FieldEditor
                  key={`${path}.${nestedField.name}-${nestedIndex}`}
                  field={nestedField}
                  path={`${path}.${nestedField.name}`}
                  index={nestedIndex}
                  parentPath={`${fullPath}.fields`}
                  level={level + 1}
                  expandedFields={expandedFields}
                  totalFields={field.fields?.length ?? 0}
                  onRemoveField={onRemoveField}
                  onUpdateField={onUpdateField}
                  onMoveField={onMoveField}
                  onToggleExpanded={onToggleExpanded}
                  onAddField={onAddField}
                />
              ))}
              <Button
                variant="soft"
                colorScheme="accent"
                leftIcon={<Plus size={14} />}
                onClick={() => onAddField(path)}
                fullWidth
              >
                Add field to {field.name}
              </Button>
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

const RandomDataGenerator: React.FC = () => {
  const [schema, setSchema] = useState<FieldSchema[]>(DataUtils.defaultSchema);
  const [count, setCount] = useState<number>(5);
  const [generatedData, setGeneratedData] = useState<
    GeneratedDataItem[] | null
  >(null);
  const [view, setView] = useState<'table' | 'json'>('table');
  const [expandedFields, setExpandedFields] = useState<{
    [key: string]: boolean;
  }>({ address: true });

  const toggleExpanded = (path: string) =>
    setExpandedFields((prev) => ({ ...prev, [path]: !prev[path] }));

  const handleAddField = (parentPath: string = '') =>
    setSchema(DataUtils.addField(schema, parentPath));
  const handleRemoveField = (path: string) =>
    setSchema(DataUtils.removeField(schema, path));
  const handleUpdateField = (
    path: string,
    updatedField: Partial<FieldSchema>,
  ) => setSchema(DataUtils.updateField(schema, path, updatedField));
  const handleMoveField = (path: string, direction: 'up' | 'down') =>
    setSchema(DataUtils.moveField(schema, path, direction));

  const handleGenerate = () => {
    setGeneratedData(DataUtils.generateData(schema, count));
  };

  const handleDownload = () => {
    if (!generatedData) return;
    DataUtils.downloadJson(generatedData);
  };

  const flattenedData = generatedData
    ? DataUtils.flattenData(generatedData)
    : [];
  const headers = generatedData ? DataUtils.getAllHeaders(flattenedData) : [];

  return (
    <Container size="full">
      <Grid columns={{ base: 1, md: 2 }} gap="4">
        <Card variant="elevated" size="md">
          <CardHeader>
            <CardTitle as="h3">Schema definition</CardTitle>
          </CardHeader>
          <CardBody>
            <Stack gap="4">
              <Stack gap="3">
                {schema.map((field, index) => (
                  <FieldEditor
                    key={`${field.name}-${index}`}
                    field={field}
                    path={field.name}
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
                  variant="soft"
                  colorScheme="accent"
                  leftIcon={<PlusCircle size={16} />}
                  onClick={() => handleAddField()}
                  fullWidth
                >
                  Add new field
                </Button>
              </Stack>

              <Card variant="filled" size="sm">
                <CardBody>
                  <Stack gap="3">
                    <Stack gap="2">
                      <Label htmlFor="gen-count">
                        Number of items to generate
                      </Label>
                      <NumberInput
                        id="gen-count"
                        value={count}
                        onChange={(v) =>
                          setCount(Math.max(1, v ?? 1))
                        }
                        minValue={1}
                        aria-label="Item count"
                      />
                    </Stack>
                    <Button
                      variant="solid"
                      colorScheme="accent"
                      leftIcon={<RefreshCw size={16} />}
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

        <Card variant="elevated" size="md">
          <CardHeader>
            <Inline justify="between" align="center" wrap gap="2">
              <CardTitle as="h3">Generated data</CardTitle>
              <Inline gap="2">
                <IconButton
                  variant={view === 'json' ? 'solid' : 'soft'}
                  colorScheme={view === 'json' ? 'accent' : 'neutral'}
                  size="sm"
                  label="Toggle JSON view"
                  icon={<CodeIcon size={14} />}
                  onClick={() => setView(view === 'json' ? 'table' : 'json')}
                />
                <IconButton
                  variant="soft"
                  colorScheme="accent"
                  size="sm"
                  label="Download JSON"
                  icon={<Download size={14} />}
                  disabled={!generatedData}
                  onClick={handleDownload}
                />
              </Inline>
            </Inline>
          </CardHeader>
          <CardBody>
            {!generatedData ? (
              <Center paddingY="10">
                <Stack gap="2" align="center">
                  <Download size={32} aria-hidden />
                  <Text size="sm" variant="caption" align="center">
                    No data generated yet. Define your schema and click
                    Generate.
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Tabs
                value={view}
                onValueChange={(v) => setView(v as 'table' | 'json')}
                variant="line"
                colorScheme="accent"
              >
                <TabsList aria-label="View">
                  <TabsTrigger value="table">Table</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="table">
                  <Box paddingTop="3">
                    <Stack gap="2">
                      <Alert status="info" variant="soft">
                        <AlertDescription>
                          Complex nested objects are shown as simplified strings
                          in table view. Switch to JSON for full structure.
                        </AlertDescription>
                      </Alert>
                      <Box overflow="auto">
                        <Table variant="striped" size="sm">
                          <TableHead>
                            <TableRow>
                              {headers.map((h) => (
                                <TableHeader key={h}>{h}</TableHeader>
                              ))}
                            </TableRow>
                          </TableHead>
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
                      </Box>
                    </Stack>
                  </Box>
                </TabsContent>

                <TabsContent value="json">
                  <Box paddingTop="3">
                    <Code variant="block" size="sm">
                      {JSON.stringify(generatedData, null, 2)}
                    </Code>
                  </Box>
                </TabsContent>
              </Tabs>
            )}
          </CardBody>
        </Card>
      </Grid>
    </Container>
  );
};

export default RandomDataGenerator;
