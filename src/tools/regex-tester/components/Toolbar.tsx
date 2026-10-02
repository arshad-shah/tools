import React from 'react';
import {
  IconChevronDown,
  IconCodeXml,
  IconSettings,
  IconX,
  IconZap,
} from '@/shared/ui/icons';

import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Inline,
  Text,
} from '@/shared/ui';
import { findTemplate } from '../lib/templates';
import { TemplatePicker } from './TemplatePicker';

interface ToolbarProps {
  selectedTemplate: string;
  onTemplateSelect: (name: string) => void;
  isValid: boolean;
  matchCount: number;
  coverage: number;
  flagsStr: string;
  /** "Copy as JavaScript" needs a valid, non-empty pattern. */
  canCopyJs: boolean;
  onCopyAsJs: () => void;
  onGenerateSample: () => void;
  onClearAll: () => void;
}

/** Template picker, status badges and the Actions menu. */
export const Toolbar: React.FC<ToolbarProps> = ({
  selectedTemplate,
  onTemplateSelect,
  isValid,
  matchCount,
  coverage,
  flagsStr,
  canCopyJs,
  onCopyAsJs,
  onGenerateSample,
  onClearAll,
}) => (
  <Card>
    <CardBody>
      <Inline justify="between" align="center" gap="3" wrap>
        <Inline align="center" gap="3" wrap>
          <TemplatePicker
            value={selectedTemplate}
            onSelect={onTemplateSelect}
          />

          <div className="h-6 w-px shrink-0 bg-line" aria-hidden />

          <Inline align="center" gap="2" wrap>
            <Badge
              variant="soft"
              tone={isValid ? 'success' : 'danger'}
              size="sm"
            >
              {isValid ? 'Valid' : 'Invalid'}
            </Badge>
            <Badge variant="soft" tone="neutral" size="sm">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </Badge>
            {matchCount > 0 && (
              <Badge variant="soft" tone="accent" size="sm">
                {coverage}% coverage
              </Badge>
            )}
            <Badge variant="outline" tone="neutral" size="sm" mono>
              /{flagsStr || '—'}
            </Badge>
          </Inline>
        </Inline>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="soft"
              size="sm"
              rightIcon={<IconChevronDown size="sm" />}
              leftIcon={<IconSettings size="sm" />}
            >
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCopyAsJs} disabled={!canCopyJs}>
              <Inline align="center" gap="2">
                <IconCodeXml size="sm" />
                <span>Copy as JavaScript</span>
              </Inline>
            </DropdownMenuItem>
            {selectedTemplate && (
              <DropdownMenuItem onClick={onGenerateSample}>
                <Inline align="center" gap="2">
                  <IconZap size="sm" />
                  <span>Generate sample text</span>
                </Inline>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearAll}>
              <Inline align="center" gap="2">
                <IconX size="sm" />
                <span>Clear all</span>
              </Inline>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Inline>

      {selectedTemplate && (
        <Box className="pt-3">
          <Text size="xs" tone="subtle">
            {findTemplate(selectedTemplate)?.description}
          </Text>
        </Box>
      )}
    </CardBody>
  </Card>
);
