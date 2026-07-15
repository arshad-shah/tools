import React from 'react';
import { Cuboid, HelpCircle, Info, Square } from 'lucide-react';
import {
  Badge,
  Box,
  Card,
  CardBody,
  Center,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Grid,
  Heading,
  Inline,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure-react';
import { Element } from '../../types/PeriodicTableTypes';
import { colorMap } from './Data';
import ElementModel3D from './ElementModal3D';
import ElementModel2D from './ElementModel2D';

interface ElementModalProps {
  element: Element;
  onClose: () => void;
  use3D: boolean;
  onToggle3D: () => void;
}

const getTextColor = (hexColor: string): string => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#0f172a' : '#ffffff';
};

const COLOR_LEGEND = [
  { color: '#f44336', label: 'Nucleus (protons and neutrons)' },
  { color: '#2196f3', label: 'First shell electrons' },
  { color: '#4caf50', label: 'Second shell electrons' },
  { color: '#ffeb3b', label: 'Third shell electrons' },
  { color: '#ff9800', label: 'Fourth shell electrons' },
];

const ElementModal: React.FC<ElementModalProps> = ({
  element,
  onClose,
  use3D,
  onToggle3D,
}) => {
  const bg = colorMap[element.group];
  const fg = getTextColor(bg);

  const properties = [
    { label: 'Atomic number', value: element.number },
    {
      label: 'Group',
      value: element.group.charAt(0).toUpperCase() + element.group.slice(1),
    },
    { label: 'Period', value: element.period },
    {
      label: 'Atomic mass',
      value:
        typeof element.mass === 'number'
          ? `${element.mass.toFixed(3)} u`
          : `${element.mass} u`,
    },
    { label: 'Electron configuration', value: element.electrons },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <Box
            padding="4"
            borderRadius="lg"
            style={{
              background: bg,
              color: fg,
            }}
          >
            <Inline justify="between" align="center" gap="3" wrap>
              <Inline align="center" gap="4">
                <Heading
                  level={2}
                  size="xl"
                  weight="bold"
                  style={{ color: fg, opacity: 0.9 }}
                >
                  {element.number}
                </Heading>
                <Stack gap="0">
                  <DialogTitle style={{ color: fg }}>
                    {element.symbol}
                  </DialogTitle>
                  <DialogDescription style={{ color: fg }}>
                    {element.name}
                  </DialogDescription>
                </Stack>
              </Inline>
              <Text size="md" weight="medium" style={{ color: fg }}>
                {typeof element.mass === 'number'
                  ? element.mass.toFixed(3)
                  : element.mass}{' '}
                u
              </Text>
            </Inline>
          </Box>
        </DialogHeader>

        <Stack gap="4" paddingTop="4">
          <Card variant="filled" size="md">
            <CardBody>
              <Stack gap="3">
                <Center
                  height="400px"
                  width="full"
                  overflow="hidden"
                  borderRadius="lg"
                >
                  {use3D ? (
                    <ElementModel3D
                      element={element}
                      containerSize={{ width: 800, height: 400 }}
                    />
                  ) : (
                    <ElementModel2D
                      element={element}
                      containerSize={{ width: 800, height: 400 }}
                    />
                  )}
                </Center>
                <Inline align="center" gap="2">
                  <Switch
                    checked={use3D}
                    onCheckedChange={onToggle3D}
                    aria-label="Toggle 3D model"
                  />
                  <Inline gap="1" align="center">
                    {use3D ? (
                      <Cuboid size={14} aria-hidden />
                    ) : (
                      <Square size={14} aria-hidden />
                    )}
                    <Text size="sm" weight="medium">
                      {use3D ? '3D model' : '2D model'}
                    </Text>
                  </Inline>
                </Inline>
              </Stack>
            </CardBody>
          </Card>

          <Grid columns={{ base: 1, lg: 2 }} gap="3">
            <Card variant="filled" size="sm">
              <CardBody>
                <Stack gap="3">
                  <Inline align="center" gap="2">
                    <Info size={16} aria-hidden />
                    <Heading level={4} size="md" weight="semibold">
                      Element information
                    </Heading>
                  </Inline>
                  <Stack gap="2">
                    {properties.map((p) => (
                      <Inline
                        key={p.label}
                        justify="between"
                        align="center"
                        gap="2"
                        wrap
                      >
                        <Text size="sm" weight="medium">
                          {p.label}
                        </Text>
                        <Badge variant="soft" colorScheme="neutral" size="sm">
                          {p.value}
                        </Badge>
                      </Inline>
                    ))}
                  </Stack>
                </Stack>
              </CardBody>
            </Card>

            <Card variant="filled" size="sm">
              <CardBody>
                <Stack gap="3">
                  <Heading level={4} size="md" weight="semibold">
                    Description
                  </Heading>
                  <Text size="sm">{element.description}</Text>
                </Stack>
              </CardBody>
            </Card>
          </Grid>

          {use3D && (
            <Card variant="outlined" size="sm">
              <CardBody>
                <Stack gap="3">
                  <Inline align="center" gap="2">
                    <HelpCircle size={16} aria-hidden />
                    <Heading level={4} size="md" weight="semibold">
                      3D model legend
                    </Heading>
                  </Inline>
                  <Inline gap="2" wrap>
                    {COLOR_LEGEND.map((item) => (
                      <Inline key={item.label} align="center" gap="2">
                        <Box
                          aria-hidden
                          width="12px"
                          height="12px"
                          borderRadius="full"
                          style={{
                            background: item.color,
                          }}
                        />
                        <Text size="xs">{item.label}</Text>
                      </Inline>
                    ))}
                  </Inline>
                  <Text size="xs" variant="caption" italic>
                    The model is a simplified representation of the atomic
                    structure.
                  </Text>
                </Stack>
              </CardBody>
            </Card>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default ElementModal;
