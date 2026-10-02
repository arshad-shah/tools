import React from 'react';
import { IconBarChart3 } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Stack,
} from '@/shared/ui';
import type { Match } from '../lib/match';
import { MatchItem } from './MatchItem';

interface MatchListProps {
  matches: Match[];
  onCopy: (text: string) => void;
}

/** Up to the first 100 matches, each with copy and group details. */
export const MatchList: React.FC<MatchListProps> = ({ matches, onCopy }) => (
  <Card>
    <CardHeader>
      <Inline gap="2" align="center">
        <IconBarChart3 size="md" />
        <CardTitle as="h2">Matches ({matches.length})</CardTitle>
      </Inline>
    </CardHeader>
    <CardBody>
      <Stack gap="2">
        {matches.slice(0, 100).map((m, i) => (
          <MatchItem
            key={i}
            match={m}
            index={i}
            onCopy={() => onCopy(m.text)}
          />
        ))}
        {matches.length > 100 && (
          <Alert status="info">
            <AlertDescription>
              Showing first 100 of {matches.length} matches. Consider refining
              your pattern for better performance.
            </AlertDescription>
          </Alert>
        )}
      </Stack>
    </CardBody>
  </Card>
);
