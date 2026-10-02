import React, { useState } from 'react';
import {
  IconLock,
  IconRefreshCw,
  IconRuler,
  IconShield,
} from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Slider,
  Stack,
  Text,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { CharacterTypeOption } from './components/CharacterTypeOption';
import { PasswordDisplay } from './components/PasswordDisplay';
import {
  DEFAULT_OPTIONS,
  generatePassword,
  getSecurityLevel,
  hasCharType,
} from './lib/strength';

const SecurePasswordGenerator: React.FC = () => {
  const [password, setPassword] = useState(() =>
    generatePassword(DEFAULT_OPTIONS),
  );
  const [length, setLength] = useState<number>(DEFAULT_OPTIONS.length);
  const [includeUppercase, setIncludeUppercase] = useState(
    DEFAULT_OPTIONS.uppercase,
  );
  const [includeLowercase, setIncludeLowercase] = useState(
    DEFAULT_OPTIONS.lowercase,
  );
  const [includeNumbers, setIncludeNumbers] = useState(DEFAULT_OPTIONS.numbers);
  const [includeSpecial, setIncludeSpecial] = useState(DEFAULT_OPTIONS.special);
  const { copiedKey, copy } = useClipboard();
  // Keyed by the password itself so regenerating clears the "Copied" state.
  const copied = copiedKey !== null && copiedKey === password;
  const [missingTypes, setMissingTypes] = useState(false);

  const handleGenerate = () => {
    const options = {
      length,
      uppercase: includeUppercase,
      lowercase: includeLowercase,
      numbers: includeNumbers,
      special: includeSpecial,
    };
    setMissingTypes(!hasCharType(options));
    setPassword(generatePassword(options));
  };

  const copyToClipboard = () => void copy(password, password);

  const security = getSecurityLevel(length);

  return (
    <Stack gap="6">
      <Card>
        <CardHeader>
          <Inline justify="between" align="center" wrap>
            <Inline align="center" gap="2">
              <IconRuler size="lg" />
              <CardTitle as="h2">Password length</CardTitle>
            </Inline>
            <Inline gap="2" align="center">
              <Badge variant="soft" tone={security.colorScheme} size="sm">
                {security.label}
              </Badge>
              <Badge variant="soft" tone="accent" size="sm">
                {length} characters
              </Badge>
            </Inline>
          </Inline>
        </CardHeader>
        <CardBody>
          <Stack gap="6">
            <Slider
              value={length}
              onValueChange={setLength}
              min={8}
              max={64}
              step={1}
              aria-label="Password length"
            />

            <Stack gap="3">
              <Inline align="center" gap="2">
                <IconLock size="lg" />
                <CardTitle as="h2">Character types</CardTitle>
              </Inline>
              <CharacterTypeOption
                label="Uppercase letters"
                sublabel="A–Z (26 characters)"
                checked={includeUppercase}
                onChange={setIncludeUppercase}
                recommended
              />
              <CharacterTypeOption
                label="Lowercase letters"
                sublabel="a–z (26 characters)"
                checked={includeLowercase}
                onChange={setIncludeLowercase}
                recommended
              />
              <CharacterTypeOption
                label="Numbers"
                sublabel="0–9 (10 characters)"
                checked={includeNumbers}
                onChange={setIncludeNumbers}
                recommended
              />
              <CharacterTypeOption
                label="Special characters"
                sublabel="!@#$%^&* and more (24 characters)"
                checked={includeSpecial}
                onChange={setIncludeSpecial}
                recommended
              />
            </Stack>
          </Stack>
        </CardBody>
      </Card>

      <Button
        onClick={handleGenerate}
        leftIcon={<IconRefreshCw size="lg" />}
        size="lg"
        variant="solid"
        className="w-full"
      >
        Generate secure password
      </Button>

      {missingTypes && (
        <Alert status="danger">
          <AlertDescription>
            Please select at least one character type.
          </AlertDescription>
        </Alert>
      )}

      {password && !missingTypes && (
        <PasswordDisplay
          password={password}
          onCopy={copyToClipboard}
          copied={copied}
        />
      )}

      <Alert status="info" icon={<IconShield />}>
        <AlertDescription>
          <Text weight="medium" as="span">
            Secure generation.
          </Text>{' '}
          All passwords are generated using cryptographically secure random
          numbers in your browser. No data is sent to any server.
        </AlertDescription>
      </Alert>
    </Stack>
  );
};

export default SecurePasswordGenerator;
