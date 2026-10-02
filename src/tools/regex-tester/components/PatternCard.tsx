import React from 'react';
import {
  IconAlertCircle,
  IconCheck,
  IconCodeXml,
  IconCopy,
} from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Box,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  IconButton,
  Inline,
  Input,
  Label,
  Stack,
  Text,
} from '@/shared/ui';
import type { Flags } from '../types';
import { FlagToggles } from './FlagToggles';

interface PatternCardProps {
  pattern: string;
  onPatternChange: (pattern: string) => void;
  flags: Flags;
  flagsStr: string;
  onToggleFlag: (key: keyof Flags) => void;
  isValid: boolean;
  errorMessage: string;
  runError: string;
  copied: boolean;
  onCopyPattern: () => void;
}

/** Pattern input with the copy button, error alerts and flag toggles. */
export const PatternCard: React.FC<PatternCardProps> = ({
  pattern,
  onPatternChange,
  flags,
  flagsStr,
  onToggleFlag,
  isValid,
  errorMessage,
  runError,
  copied,
  onCopyPattern,
}) => (
  <Card>
    <CardHeader>
      <Inline gap="2" align="center">
        <IconCodeXml size="lg" />
        <CardTitle as="h2">Regular expression</CardTitle>
      </Inline>
    </CardHeader>
    <CardBody>
      <Stack gap="4">
        <Stack gap="2">
          <Label htmlFor="regex-pattern">Pattern</Label>
          <Inline gap="2" align="center" className="w-full">
            <Box className="w-full min-w-0 flex-1">
              <Input
                id="regex-pattern"
                type="text"
                value={pattern}
                onChange={onPatternChange}
                placeholder="Enter your regex pattern…"
                invalid={!isValid}
                aria-label="Regex pattern"
                leadingSlot={
                  <Text size="md" weight="semibold">
                    /
                  </Text>
                }
                trailingSlot={
                  <Text size="md" weight="semibold">
                    /{flagsStr}
                  </Text>
                }
              />
            </Box>
            <IconButton
              variant="soft"
              className={copied ? 'border-success/40 text-success' : undefined}
              label="Copy regex with flags"
              disabled={!pattern || !isValid}
              icon={copied ? <IconCheck size="sm" /> : <IconCopy size="sm" />}
              onClick={onCopyPattern}
            />
          </Inline>
          {!isValid && errorMessage && (
            <Alert status="danger">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          {runError && (
            <Alert status="danger" icon={<IconAlertCircle />}>
              <AlertDescription>{runError}</AlertDescription>
            </Alert>
          )}
        </Stack>

        <FlagToggles flags={flags} onToggle={onToggleFlag} />
      </Stack>
    </CardBody>
  </Card>
);
