import React from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { IconDownload, IconInfo } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Stack,
  Text,
  List,
  ListItem,
} from '@/shared/ui';
import { ERROR_LEVEL_PCT } from '../lib/options';
import type { QRCodeState } from '../types';

export const QrPreview: React.FC<{
  state: QRCodeState;
  finalData: string;
  /** Set when encryption failed: nothing is encoded then. */
  encryptionError: string | null;
  qrRef: React.RefObject<HTMLDivElement>;
  onDownload: () => void;
}> = ({ state, finalData, encryptionError, qrRef, onDownload }) => (
  <Card>
    <CardHeader>
      <CardTitle as="h3">QR code preview</CardTitle>
    </CardHeader>
    <CardBody>
      <Stack gap="4" align="center">
        {encryptionError && (
          <Alert status="danger">
            <AlertTitle>Encryption failed</AlertTitle>
            <AlertDescription>
              The content was not encoded, so it is never shared unencrypted.
              Details: {encryptionError}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardBody>
            <Center>
              <div ref={qrRef}>
                {encryptionError ? null : state.renderAs === 'svg' ? (
                  <QRCodeSVG
                    value={finalData || ' '}
                    size={state.size}
                    bgColor={state.backgroundColor}
                    fgColor={state.foregroundColor}
                    level={state.errorCorrectionLevel}
                    includeMargin={state.includeMargin}
                    imageSettings={
                      state.useImage && state.imageSettings.src
                        ? state.imageSettings
                        : undefined
                    }
                    minVersion={state.version > 0 ? state.version : 1}
                  />
                ) : (
                  <QRCodeCanvas
                    value={finalData || ' '}
                    size={state.size}
                    bgColor={state.backgroundColor}
                    fgColor={state.foregroundColor}
                    level={state.errorCorrectionLevel}
                    includeMargin={state.includeMargin}
                    imageSettings={
                      state.useImage && state.imageSettings.src
                        ? state.imageSettings
                        : undefined
                    }
                    minVersion={state.version > 0 ? state.version : 1}
                  />
                )}
              </div>
            </Center>
          </CardBody>
        </Card>
        <Badge variant="soft" tone="neutral" size="sm">
          {state.renderAs === 'svg' ? 'SVG format' : 'PNG format'}
        </Badge>
        <Button
          onClick={onDownload}
          disabled={encryptionError !== null}
          variant="solid"
          size="md"
          fullWidth
          leftIcon={<IconDownload size="md" />}
        >
          Download QR code
        </Button>
        <Alert status="info" icon={<IconInfo />}>
          {/* Not AlertDescription: a <p> can't hold block content. */}
          <Stack gap="1" className="mt-1 text-fg-muted">
            <Text size="sm">
              <Text as="span" weight="semibold">
                Error correction:
              </Text>{' '}
              {state.errorCorrectionLevel} (
              {ERROR_LEVEL_PCT[state.errorCorrectionLevel]})
            </Text>
            {state.encryptionConfig.type !== 'none' && (
              <Text size="sm">
                <Text as="span" weight="semibold">
                  Encryption:
                </Text>{' '}
                {state.encryptionConfig.type.toUpperCase()}
              </Text>
            )}
          </Stack>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle as="h4">Tips</CardTitle>
          </CardHeader>
          <CardBody>
            <Stack gap="1">
              <List className="gap-1">
                <ListItem className="text-xs">
                  Higher error correction improves scan reliability
                </ListItem>
                <ListItem className="text-xs">
                  Ensure good contrast between foreground and background
                </ListItem>
                <ListItem className="text-xs">
                  Test your QR code on multiple devices
                </ListItem>
              </List>
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    </CardBody>
  </Card>
);
