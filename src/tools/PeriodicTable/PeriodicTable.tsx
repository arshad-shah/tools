import React, { useState } from 'react';
import { Cuboid, Square } from 'lucide-react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Container,
  Heading,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure-react';
import { colorMap } from './Data';
import { Element } from '../../types/PeriodicTableTypes';
import ElementGrid from './ElementGrid';
import ElementDetails from './ElementDetails';
import ElementModal from './ElementModal';

const PeriodicTable: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [use3D, setUse3D] = useState(true);

  return (
    <Container size="full">
      <Stack gap="6">
        <Inline justify="between" align="center" wrap gap="3">
          <Stack gap="1">
            <Heading level={1} size="3xl" weight="bold">
              Interactive Periodic Table
            </Heading>
            <Text size="sm" variant="caption">
              Explore elements and their properties with{' '}
              {use3D ? '3D' : '2D'} models.
            </Text>
          </Stack>
          <ButtonGroup>
            <Button
              variant={use3D ? 'solid' : 'soft'}
              colorScheme={use3D ? 'accent' : 'neutral'}
              size="sm"
              leftIcon={<Cuboid size={14} />}
              onClick={() => setUse3D(true)}
            >
              3D
            </Button>
            <Button
              variant={!use3D ? 'solid' : 'soft'}
              colorScheme={!use3D ? 'accent' : 'neutral'}
              size="sm"
              leftIcon={<Square size={14} />}
              onClick={() => setUse3D(false)}
            >
              2D
            </Button>
          </ButtonGroup>
        </Inline>

        <ElementGrid
          selectedElement={selectedElement}
          onElementClick={setSelectedElement}
        />

        <Card variant="elevated" size="md">
          {selectedElement ? (
            <ElementDetails
              element={selectedElement}
              onViewDetailsClick={() => setShowModal(true)}
              use3D={use3D}
              onToggle3D={() => setUse3D(!use3D)}
            />
          ) : (
            <CardBody>
              <Center paddingY="10">
                <Stack gap="3" align="center">
                  <Box style={{ fontSize: '3rem' }} aria-hidden>
                    ⚛️
                  </Box>
                  <Heading level={3} size="lg" weight="semibold" align="center">
                    Select an element to view details
                  </Heading>
                  <Text size="sm" variant="caption" align="center">
                    Discover properties, electron configurations, and{' '}
                    {use3D ? '3D' : '2D'} visualisations.
                  </Text>
                </Stack>
              </Center>
            </CardBody>
          )}
        </Card>

        {showModal && selectedElement && (
          <ElementModal
            element={selectedElement}
            onClose={() => setShowModal(false)}
            use3D={use3D}
            onToggle3D={() => setUse3D(!use3D)}
          />
        )}

        <Card variant="filled" size="md">
          <CardHeader>
            <CardTitle as="h3">Element categories</CardTitle>
          </CardHeader>
          <CardBody>
            <Inline gap="2" wrap justify="center">
              {Object.entries(colorMap).map(([group, color]) => (
                <Card key={group} variant="outlined" size="sm">
                  <CardBody>
                    <Inline align="center" gap="2">
                      <Box
                        aria-hidden
                        style={{
                          width: 16,
                          height: 16,
                          background: color,
                          borderRadius: 4,
                          border: '1px solid rgba(0,0,0,0.1)',
                        }}
                      />
                      <Text size="sm" weight="medium">
                        {group.charAt(0).toUpperCase() + group.slice(1)}
                      </Text>
                    </Inline>
                  </CardBody>
                </Card>
              ))}
            </Inline>
          </CardBody>
        </Card>

        <Text size="xs" variant="caption" align="center">
          Data sourced from International Union of Pure and Applied Chemistry
          (IUPAC).
        </Text>
      </Stack>
    </Container>
  );
};

export default PeriodicTable;
