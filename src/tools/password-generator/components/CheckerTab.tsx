import {
  Card,
  LoadingDots,
  Inline,
  List,
  Notice,
  ProgressBar,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import React, { useEffect, useState } from 'react';
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
    <Card as="section" title="Check a password">
      <Stack gap="5">
        <TextField
          label="Password to check"
          type="password"
          revealable
          size="lg"
          value={password}
          onChange={setPassword}
          autoComplete="off"
          spellCheck={false}
          placeholder="Typed here, scored on this device, never stored"
          description="The checker and its dictionaries load from this site only."
        />
        {password && !r ? (
          <Inline gap="2" align="center">
            <LoadingDots tone="muted" />
            <Text tone="muted">Checking</Text>
          </Inline>
        ) : null}
        {r ? (
          <Stack gap="4">
            <ProgressBar
              label="Score"
              meter
              showValue
              value={r.score}
              max={4}
              steps={5}
              valueText={`${r.score} of 4: ${SCORE_WORDS[r.score]}`}
              tone={
                r.score < 2 ? 'danger' : r.score < 3 ? 'warning' : 'success'
              }
            />
            <Text>
              {`About 10^${Math.round(r.guessesLog10)} guesses. Online: ${r.crackTime.online}. Offline fast hash: ${r.crackTime.offline}.`}
            </Text>
            {r.warning ? <Notice tone="warning">{r.warning}</Notice> : null}
            {r.suggestions.length > 0 ? (
              <List
                label="Suggestions"
                items={r.suggestions.map((s) => ({ id: s, label: s }))}
              />
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
};
