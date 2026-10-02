import React from 'react';
import {
  IconAlertCircle,
  IconBraces,
  IconCheckCircle,
  IconClock,
  IconCopy,
  IconGlobe,
  IconSettings,
  IconShield,
  IconUser,
} from '@/shared/ui/icons';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardBody,
  Code,
  Grid,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { ExpiryInfo, JWTPayload } from '../types';
import type { CategorizedClaims } from '../lib/categorize';
import { getClaimIcon } from '../lib/claim-icon';
import { formatTime, getClaimLabel } from '../lib/claims';
import { ClaimCard } from './ClaimCard';

interface PayloadSectionProps {
  payload: JWTPayload;
  categorizedClaims: CategorizedClaims;
  expiryInfo: ExpiryInfo;
  copiedKey: string | null;
  copy: (text: string, key?: string) => Promise<boolean>;
}

export const PayloadSection: React.FC<PayloadSectionProps> = ({
  payload,
  categorizedClaims,
  expiryInfo,
  copiedKey,
  copy,
}) => (
  <Stack gap="4">
    {categorizedClaims.identity.length > 0 && (
      <Accordion type="single" defaultValue="identity">
        <AccordionItem value="identity">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-2">
              <IconUser size="sm" />
              <Text as="span" weight="medium">
                Identity claims
              </Text>
              <Badge variant="soft" tone="accent" size="xs">
                {categorizedClaims.identity.length}
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Grid max={2} gap="3">
              {categorizedClaims.identity.map(([k, v]) => (
                <ClaimCard
                  key={k}
                  label={getClaimLabel(k)}
                  value={v}
                  icon={getClaimIcon(k)}
                />
              ))}
            </Grid>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )}
    {categorizedClaims.access.length > 0 && (
      <Accordion type="single" defaultValue="access">
        <AccordionItem value="access">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-2">
              <IconShield size="sm" />
              <Text as="span" weight="medium">
                Access &amp; permissions
              </Text>
              <Badge variant="soft" tone="warning" size="xs">
                {categorizedClaims.access.length}
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Grid max={2} gap="3">
              {categorizedClaims.access.map(([k, v]) => (
                <ClaimCard
                  key={k}
                  label={getClaimLabel(k)}
                  value={v}
                  icon={getClaimIcon(k)}
                  colorScheme="warning"
                />
              ))}
            </Grid>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )}
    {categorizedClaims.timing.length > 0 && (
      <Accordion type="single" defaultValue="timing">
        <AccordionItem value="timing">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-2">
              <IconClock size="sm" />
              <Text as="span" weight="medium">
                Timestamps
              </Text>
              <Badge variant="soft" tone="accent" size="xs">
                {categorizedClaims.timing.length}
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Stack gap="3">
              {categorizedClaims.timing.map(([k, v]) => {
                const isExpired = k === 'exp' && expiryInfo.isExpired;
                const isExp = k === 'exp';
                return (
                  <Card key={k}>
                    <CardBody>
                      <Inline justify="between" align="center" gap="3" wrap>
                        <Inline align="center" gap="3">
                          {isExpired ? (
                            <IconAlertCircle size="lg" />
                          ) : isExp ? (
                            <IconCheckCircle size="lg" />
                          ) : (
                            getClaimIcon(k)
                          )}
                          <Stack gap="1">
                            <Text size="sm" weight="medium">
                              {getClaimLabel(k)}
                            </Text>
                            <Text size="xs" tone="subtle">
                              {formatTime(v as number)}
                            </Text>
                          </Stack>
                        </Inline>
                        {isExp && !isExpired && (
                          <Badge variant="soft" tone="success" size="sm">
                            {expiryInfo.timeLeft} left
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge variant="soft" tone="danger" size="sm">
                            Expired
                          </Badge>
                        )}
                      </Inline>
                    </CardBody>
                  </Card>
                );
              })}
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )}
    {categorizedClaims.issuer.length > 0 && (
      <Accordion type="single" defaultValue="issuer">
        <AccordionItem value="issuer">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-2">
              <IconGlobe size="sm" />
              <Text as="span" weight="medium">
                Issuer information
              </Text>
              <Badge variant="soft" tone="accent" size="xs">
                {categorizedClaims.issuer.length}
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Stack gap="3">
              {categorizedClaims.issuer.map(([k, v]) => (
                <ClaimCard
                  key={k}
                  label={getClaimLabel(k)}
                  value={v}
                  icon={getClaimIcon(k)}
                />
              ))}
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )}
    {categorizedClaims.custom.length > 0 && (
      <Accordion type="single">
        <AccordionItem value="custom">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-2">
              <IconSettings size="sm" />
              <Text as="span" weight="medium">
                Custom claims
              </Text>
              <Badge variant="soft" tone="accent" size="xs">
                {categorizedClaims.custom.length}
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Grid max={2} gap="3">
              {categorizedClaims.custom.map(([k, v]) => (
                <ClaimCard
                  key={k}
                  label={getClaimLabel(k)}
                  value={v}
                  icon={getClaimIcon(k)}
                />
              ))}
            </Grid>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )}
    <Accordion type="single">
      <AccordionItem value="raw">
        <AccordionTrigger>
          <span className="inline-flex items-center gap-2">
            <IconBraces size="sm" />
            <Text as="span" weight="medium">
              Raw JSON
            </Text>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Stack gap="2">
            <Inline justify="between" align="center">
              <Text size="sm" weight="medium">
                Complete payload
              </Text>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={
                  copiedKey === 'payload' ? (
                    <IconCheckCircle size="sm" />
                  ) : (
                    <IconCopy size="sm" />
                  )
                }
                onClick={() =>
                  void copy(JSON.stringify(payload, null, 2), 'payload')
                }
              >
                {copiedKey === 'payload' ? 'Copied' : 'Copy'}
              </Button>
            </Inline>
            <Code block>{JSON.stringify(payload, null, 2)}</Code>
          </Stack>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Stack>
);
