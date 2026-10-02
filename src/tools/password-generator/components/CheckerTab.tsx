import React, { useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Input,
  Label,
  List,
  ListItem,
  LoadingState,
  Meter,
  PrivacyNote,
  Stack,
  Text,
} from '@/shared/ui';
import { checkStrength, type StrengthReport } from '../lib/checker';

const SCORE_WORDS = [
  'Too guessable',
  'Very guessable',
  'Somewhat guessable',
  'Safely unguessable',
  'Very unguessable',
];

/** Scores an existing password locally (zxcvbn-ts, loaded on first use). */
export const CheckerTab: React.FC = () => {
  const [password, setPassword] = useState('');
  const [report, setReport] = useState<{ for: string; r: StrengthReport }>();
  useEffect(() => {
    if (!password) return;
    let live = true;
    const t = setTimeout(() => {
      void checkStrength(password).then(
        (r) => live && setReport({ for: password, r }),
      );
    }, 150);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [password]);
  const r = report && report.for === password ? report.r : null;

  return (
    <Stack gap="4">
      <Stack gap="1">
        <Label htmlFor="check-password">Password to check</Label>
        <Input
          id="check-password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="off"
          spellCheck={false}
          placeholder="Typed here, scored on this device, never stored"
        />
      </Stack>
      {password && !r && <LoadingState label="Checking" />}
      {r && (
        <Stack gap="3">
          <Meter
            label="Score"
            value={r.score / 4}
            segments={5}
            valueText={`${r.score} of 4: ${SCORE_WORDS[r.score]}`}
          />
          <Text size="sm">
            About 10^{Math.round(r.guessesLog10)} guesses. Online:{' '}
            {r.crackTime.online}. Offline fast hash: {r.crackTime.offline}.
          </Text>
          {r.warning && (
            <Alert status="warning">
              <AlertDescription>{r.warning}</AlertDescription>
            </Alert>
          )}
          {r.suggestions.length > 0 && (
            <List>
              {r.suggestions.map((s) => (
                <ListItem key={s}>{s}</ListItem>
              ))}
            </List>
          )}
        </Stack>
      )}
      <PrivacyNote variant="local">
        The checker and its dictionaries load from this site only.
      </PrivacyNote>
    </Stack>
  );
};
