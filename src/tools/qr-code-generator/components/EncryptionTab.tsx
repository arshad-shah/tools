import React from 'react';
import {
  IconAlertTriangle,
  IconHash,
  IconKey,
  IconRefreshCw,
  IconShield,
  IconShieldOff,
} from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Text,
  List,
  ListItem,
} from '@/shared/ui';
import { ENCRYPTION_OPTIONS } from '../lib/options';
import type { EncryptionConfig, EncryptionType } from '../types';

export const EncryptionTab: React.FC<{
  encryptionConfig: EncryptionConfig;
  setEncryptionConfig: (config: Partial<EncryptionConfig>) => void;
  generateRandomIV: () => void;
  generateRandomSalt: () => void;
}> = ({
  encryptionConfig,
  setEncryptionConfig,
  generateRandomIV,
  generateRandomSalt,
}) => (
  <Stack gap="4">
    <Card>
      <CardBody>
        <Stack gap="3">
          <Inline align="center" gap="2">
            <IconShield size="md" />
            <Label>Encryption method</Label>
          </Inline>
          <Select
            value={encryptionConfig.type}
            onValueChange={(v) =>
              setEncryptionConfig({ type: v as EncryptionType })
            }
            items={ENCRYPTION_OPTIONS}
            aria-label="Encryption method"
          />
        </Stack>
      </CardBody>
    </Card>

    {encryptionConfig.type === 'none' ? (
      <Alert status="info" icon={<IconShieldOff />}>
        <AlertDescription>
          Your QR code data will not be encrypted. Anyone who scans it will be
          able to read its contents.
        </AlertDescription>
      </Alert>
    ) : (
      <>
        <Card>
          <CardBody>
            <Stack gap="3">
              <Inline align="center" gap="2">
                <IconKey size="md" />
                <Label htmlFor="enc-key">Encryption key</Label>
              </Inline>
              <Input
                id="enc-key"
                value={encryptionConfig.key}
                onChange={(v) => setEncryptionConfig({ key: v })}
                placeholder="Enter a secret key"
              />
              <Text size="xs" tone="subtle">
                This key will be needed to decrypt the QR code.
              </Text>
              {(encryptionConfig.type === 'aes' ||
                encryptionConfig.type === 'tripledes') && (
                <>
                  <Stack gap="2">
                    <Label htmlFor="enc-iv">Initialization vector (IV)</Label>
                    <Inline gap="2">
                      <Box className="min-w-0 flex-1">
                        <Input
                          id="enc-iv"
                          value={encryptionConfig.iv ?? ''}
                          onChange={(v) => setEncryptionConfig({ iv: v })}
                          placeholder="16 characters"
                        />
                      </Box>
                      <Button
                        variant="secondary"
                        leftIcon={<IconRefreshCw size="sm" />}
                        onClick={generateRandomIV}
                      >
                        Generate
                      </Button>
                    </Inline>
                  </Stack>
                  {encryptionConfig.type === 'aes' && (
                    <Stack gap="2">
                      <Inline align="center" gap="2">
                        <IconHash size="sm" />
                        <Label htmlFor="enc-salt">Salt (optional)</Label>
                      </Inline>
                      <Inline gap="2">
                        <Box className="min-w-0 flex-1">
                          <Input
                            id="enc-salt"
                            value={encryptionConfig.salt ?? ''}
                            onChange={(v) => setEncryptionConfig({ salt: v })}
                            placeholder="8+ characters"
                          />
                        </Box>
                        <Button
                          variant="secondary"
                          leftIcon={<IconRefreshCw size="sm" />}
                          onClick={generateRandomSalt}
                        >
                          Generate
                        </Button>
                      </Inline>
                    </Stack>
                  )}
                </>
              )}
            </Stack>
          </CardBody>
        </Card>

        <Alert status="warning" icon={<IconAlertTriangle />}>
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            The recipient needs the same encryption method and key to decode
            this QR code. Keep your key secure and share it through a separate
            channel.
          </AlertDescription>
        </Alert>

        <Alert status="info" icon={<IconShield />}>
          {/* Not AlertDescription: a <p> can't hold block content. */}
          <Stack gap="1" className="mt-1 text-fg-muted">
            <Text size="sm" weight="semibold">
              Encryption details
            </Text>
            <List className="gap-1">
              <ListItem className="text-xs">
                AES-256 offers strongest security
              </ListItem>
              <ListItem className="text-xs">
                Triple DES is widely supported but slower
              </ListItem>
              <ListItem className="text-xs">
                RC4 is fast but has known vulnerabilities
              </ListItem>
              <ListItem className="text-xs">
                Rabbit balances speed and security
              </ListItem>
            </List>
          </Stack>
        </Alert>
      </>
    )}
  </Stack>
);
