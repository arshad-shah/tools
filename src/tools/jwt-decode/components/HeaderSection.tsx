import React from 'react';
import {
  IconBraces,
  IconFileJson,
  IconKey,
  IconSettings,
  IconShield,
} from '@/shared/ui/icons';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Grid,
  Stack,
  Text,
  TextInputPanel,
} from '@/shared/ui';
import type { JWTHeader } from '../types';
import { getClaimIcon } from '../lib/claim-icon';
import { getClaimLabel } from '../lib/claims';
import { ClaimCard } from './ClaimCard';

interface HeaderSectionProps {
  header: JWTHeader;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({ header }) => (
  <Stack gap="4">
    <Grid max={2} gap="3">
      {header.alg && (
        <ClaimCard
          label="Algorithm"
          value={header.alg}
          icon={<IconShield size="sm" />}
          colorScheme="warning"
        />
      )}
      {header.typ && (
        <ClaimCard
          label="Type"
          value={header.typ}
          icon={<IconFileJson size="sm" />}
        />
      )}
      {header.kid && (
        <ClaimCard
          label="Key ID"
          value={header.kid}
          icon={<IconKey size="sm" />}
        />
      )}
    </Grid>
    {Object.keys(header).filter((k) => !['alg', 'typ', 'kid'].includes(k))
      .length > 0 && (
      <Accordion type="single">
        <AccordionItem value="extra">
          <AccordionTrigger>
            <span className="inline-flex items-center gap-2">
              <IconSettings size="sm" />
              <Text as="span" weight="medium">
                Additional header claims
              </Text>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Grid max={2} gap="3">
              {Object.entries(header)
                .filter(([k]) => !['alg', 'typ', 'kid'].includes(k))
                .map(([k, v]) => (
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
          <TextInputPanel
            label="Complete header"
            value={JSON.stringify(header, null, 2)}
            onChange={() => {}}
            language="json"
            readOnly
            wrap
            minHeight={80}
            maxHeight={320}
            downloadName="jwt-header.json"
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Stack>
);
