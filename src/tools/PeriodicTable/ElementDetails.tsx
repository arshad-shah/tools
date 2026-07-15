import React from 'react';
import { Cuboid, ExternalLink, Info, Square } from 'lucide-react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Grid,
  Heading,
  Inline,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure-react';
import { Element } from '../../types/PeriodicTableTypes';
import { colorMap } from './Data';

interface ElementDetailsProps {
  element: Element;
  onViewDetailsClick: () => void;
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

const ElementDetails: React.FC<ElementDetailsProps> = ({
  element,
  onViewDetailsClick,
  use3D,
  onToggle3D,
}) => {
  const bg = colorMap[element.group];
  const fg = getTextColor(bg);

  const properties = [
    { name: 'Atomic number', value: element.number },
    {
      name: 'Mass',
      value:
        typeof element.mass === 'number'
          ? `${element.mass.toFixed(3)} u`
          : `${element.mass} u`,
    },
    {
      name: 'Group',
      value: element.group.charAt(0).toUpperCase() + element.group.slice(1),
    },
    { name: 'Period', value: element.period },
    { name: 'Electron configuration', value: element.electrons },
  ];

  return (
    <Stack gap="0">
      <Box padding="6" style={{ background: bg, color: fg }}>
        <Inline justify="between" align="center" gap="3" wrap>
          <Inline align="center" gap="4">
            <Heading
              level={2}
              size="2xl"
              weight="bold"
              style={{ color: fg, opacity: 0.9 }}
            >
              {element.number}
            </Heading>
            <Stack gap="0">
              <Heading level={3} size="4xl" weight="bold" style={{ color: fg }}>
                {element.symbol}
              </Heading>
              <Text size="md" weight="medium" style={{ color: fg }}>
                {element.name}
              </Text>
            </Stack>
          </Inline>
          <Text size="lg" weight="medium" style={{ color: fg }}>
            {typeof element.mass === 'number'
              ? element.mass.toFixed(3)
              : element.mass}{' '}
            u
          </Text>
        </Inline>
      </Box>

      <CardBody>
        <Stack gap="5">
          <Grid columns={{ base: 1, lg: 2 }} gap="4">
            <Stack gap="3">
              <Inline align="center" gap="2">
                <Info size={18} aria-hidden />
                <Heading level={4} size="md" weight="semibold">
                  Properties
                </Heading>
              </Inline>
              <Grid columns={{ base: 1, md: 2 }} gap="2">
                {properties.map((p) => (
                  <Card key={p.name} variant="filled" size="sm">
                    <CardBody>
                      <Stack gap="1">
                        <Text size="xs" variant="caption">
                          {p.name}
                        </Text>
                        <Text size="sm" weight="medium">
                          {p.value}
                        </Text>
                      </Stack>
                    </CardBody>
                  </Card>
                ))}
              </Grid>
            </Stack>

            <Stack gap="3">
              <Heading level={4} size="md" weight="semibold">
                Description
              </Heading>
              <Card variant="filled" size="sm">
                <CardBody>
                  <Box
                    paddingLeft="3"
                    style={{
                      borderLeft: `3px solid ${bg}`,
                    }}
                  >
                    <Text size="sm">{element.description}</Text>
                  </Box>
                </CardBody>
              </Card>
            </Stack>
          </Grid>

          <Inline justify="between" align="center" wrap gap="3">
            <Inline align="center" gap="2">
              <Switch
                checked={use3D}
                onCheckedChange={onToggle3D}
                aria-label="Toggle 3D model"
              />
              <Inline align="center" gap="1">
                {use3D ? (
                  <Cuboid size={14} aria-hidden />
                ) : (
                  <Square size={14} aria-hidden />
                )}
                <Text size="sm" weight="medium">
                  {use3D ? '3D' : '2D'} model
                </Text>
              </Inline>
            </Inline>

            <Button
              variant="solid"
              colorScheme="accent"
              size="sm"
              rightIcon={<ExternalLink size={14} />}
              onClick={onViewDetailsClick}
            >
              View model
            </Button>
          </Inline>
        </Stack>
      </CardBody>
    </Stack>
  );
};

export default ElementDetails;
