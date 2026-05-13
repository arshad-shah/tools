import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Ruler,
  Shield,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  IconButton,
  Inline,
  Slider,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure-react';
import { charSets, getSecureRandom, secureShuffle } from './utils/utils';

interface CharacterTypeOptionProps {
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  recommended?: boolean;
}

const CharacterTypeOption: React.FC<CharacterTypeOptionProps> = ({
  label,
  sublabel,
  checked,
  onChange,
  recommended = false,
}) => (
  <Card variant={checked ? 'outlined' : 'filled'} size="sm">
    <CardBody>
      <Inline justify="between" align="center" gap="3" wrap>
        <Stack gap="1">
          <Inline align="center" gap="2">
            <Text size="sm" weight="semibold">
              {label}
            </Text>
            {recommended && (
              <Badge variant="soft" colorScheme="warning" size="xs">
                Recommended
              </Badge>
            )}
          </Inline>
          <Text size="xs" variant="caption">
            {sublabel}
          </Text>
        </Stack>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          aria-label={`Toggle ${label}`}
        />
      </Inline>
    </CardBody>
  </Card>
);

interface PasswordDisplayProps {
  password: string;
  onCopy: () => void;
  copied: boolean;
}

const PasswordDisplay: React.FC<PasswordDisplayProps> = ({
  password,
  onCopy,
  copied,
}) => {
  const [hidden, setHidden] = useState(false);
  const counts = {
    uppercase: password.match(/[A-Z]/g)?.length || 0,
    lowercase: password.match(/[a-z]/g)?.length || 0,
    numbers: password.match(/[0-9]/g)?.length || 0,
    special: password.match(/[^A-Za-z0-9]/g)?.length || 0,
  };

  return (
    <Card variant="elevated" size="md">
      <CardHeader>
        <Inline justify="between" align="center">
          <CardTitle as="h3">Generated password</CardTitle>
          <IconButton
            variant="ghost"
            colorScheme="neutral"
            size="sm"
            label={hidden ? 'Show password' : 'Hide password'}
            icon={hidden ? <Eye size={16} /> : <EyeOff size={16} />}
            onClick={() => setHidden(!hidden)}
          />
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="4">
          <Stack gap="2">
            <Code size="md" variant="block">
              {hidden ? '•'.repeat(password.length) : password}
            </Code>
            <Inline justify="end">
              <Button
                variant={copied ? 'solid' : 'soft'}
                colorScheme={copied ? 'success' : 'accent'}
                size="md"
                leftIcon={copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                onClick={onCopy}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Inline>
          </Stack>
          <Inline gap="2" wrap>
            {counts.uppercase > 0 && (
              <Badge variant="soft" colorScheme="warning" size="sm">
                {counts.uppercase} uppercase
              </Badge>
            )}
            {counts.lowercase > 0 && (
              <Badge variant="soft" colorScheme="neutral" size="sm">
                {counts.lowercase} lowercase
              </Badge>
            )}
            {counts.numbers > 0 && (
              <Badge variant="soft" colorScheme="success" size="sm">
                {counts.numbers} numbers
              </Badge>
            )}
            {counts.special > 0 && (
              <Badge variant="soft" colorScheme="info" size="sm">
                {counts.special} special
              </Badge>
            )}
          </Inline>
        </Stack>
      </CardBody>
    </Card>
  );
};

const getSecurityLevel = (length: number) => {
  if (length < 12) return { label: 'Weak', colorScheme: 'danger' as const };
  if (length < 16) return { label: 'Basic', colorScheme: 'warning' as const };
  if (length < 24) return { label: 'Strong', colorScheme: 'accent' as const };
  if (length < 32) return { label: 'Very strong', colorScheme: 'success' as const };
  return { label: 'Maximum', colorScheme: 'success' as const };
};

const SecurePasswordGenerator: React.FC = () => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState<number>(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSpecial, setIncludeSpecial] = useState(true);
  const [copied, setCopied] = useState(false);
  const [missingTypes, setMissingTypes] = useState(false);

  const generatePassword = () => {
    let charset = '';
    const mandatoryChars: string[] = [];
    if (includeUppercase) {
      charset += charSets.uppercase;
      mandatoryChars.push(
        charSets.uppercase[Math.floor(getSecureRandom() * charSets.uppercase.length)],
      );
    }
    if (includeLowercase) {
      charset += charSets.lowercase;
      mandatoryChars.push(
        charSets.lowercase[Math.floor(getSecureRandom() * charSets.lowercase.length)],
      );
    }
    if (includeNumbers) {
      charset += charSets.numbers;
      mandatoryChars.push(
        charSets.numbers[Math.floor(getSecureRandom() * charSets.numbers.length)],
      );
    }
    if (includeSpecial) {
      charset += charSets.special;
      mandatoryChars.push(
        charSets.special[Math.floor(getSecureRandom() * charSets.special.length)],
      );
    }
    if (!charset) {
      setPassword('');
      setMissingTypes(true);
      return;
    }
    setMissingTypes(false);
    const remaining = length - mandatoryChars.length;
    const randomChars = Array.from(
      { length: remaining },
      () => charset[Math.floor(getSecureRandom() * charset.length)],
    );
    setPassword(secureShuffle([...mandatoryChars, ...randomChars]).join(''));
    setCopied(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  useEffect(() => {
    generatePassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const security = getSecurityLevel(length);

  return (
    <Stack gap="6">
      <Card variant="elevated" size="md">
        <CardHeader>
          <Inline justify="between" align="center" wrap>
            <Inline align="center" gap="2">
              <Ruler size={20} aria-hidden />
              <CardTitle as="h2">Password length</CardTitle>
            </Inline>
            <Inline gap="2" align="center">
              <Badge variant="soft" colorScheme={security.colorScheme} size="sm">
                {security.label}
              </Badge>
              <Badge variant="soft" colorScheme="accent" size="sm">
                {length} characters
              </Badge>
            </Inline>
          </Inline>
        </CardHeader>
        <CardBody>
          <Stack gap="6">
            <Slider
              value={length}
              onChange={(v) => setLength(v as number)}
              minValue={8}
              maxValue={64}
              step={1}
              showValue
              aria-label="Password length"
            />

            <Stack gap="3">
              <Inline align="center" gap="2">
                <Lock size={20} aria-hidden />
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
        onClick={generatePassword}
        leftIcon={<RefreshCw size={20} />}
        size="lg"
        variant="solid"
        colorScheme="accent"
        fullWidth
      >
        Generate secure password
      </Button>

      {missingTypes && (
        <Alert status="danger" variant="soft">
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

      <Alert status="info" variant="soft" icon={<Shield aria-hidden />}>
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
