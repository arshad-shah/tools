import React, { useEffect, useMemo, useState } from 'react';
import * as CryptoJS from 'crypto-js';
import { Check, Copy, X } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  Heading,
  Inline,
  Label,
  Select,
  Stack,
  Text,
  Textarea,
} from '@arshad-shah/cynosure-react';
import useClipboard from '../../hooks/useClipboard';

interface Algorithm {
  id: string;
  name: string;
  hash: (input: string) => string;
}

const ALGORITHMS: Algorithm[] = [
  { id: 'md5', name: 'MD5', hash: (i) => CryptoJS.MD5(i).toString() },
  { id: 'sha1', name: 'SHA-1', hash: (i) => CryptoJS.SHA1(i).toString() },
  { id: 'sha256', name: 'SHA-256', hash: (i) => CryptoJS.SHA256(i).toString() },
  { id: 'sha224', name: 'SHA-224', hash: (i) => CryptoJS.SHA224(i).toString() },
  { id: 'sha384', name: 'SHA-384', hash: (i) => CryptoJS.SHA384(i).toString() },
  { id: 'sha512', name: 'SHA-512', hash: (i) => CryptoJS.SHA512(i).toString() },
  { id: 'sha3', name: 'SHA-3', hash: (i) => CryptoJS.SHA3(i).toString() },
  { id: 'ripemd160', name: 'RIPEMD-160', hash: (i) => CryptoJS.RIPEMD160(i).toString() },
  { id: 'hmacmd5', name: 'HMAC-MD5', hash: (i) => CryptoJS.HmacMD5(i, 'key').toString() },
  { id: 'hmacsha1', name: 'HMAC-SHA1', hash: (i) => CryptoJS.HmacSHA1(i, 'key').toString() },
  { id: 'hmacsha256', name: 'HMAC-SHA256', hash: (i) => CryptoJS.HmacSHA256(i, 'key').toString() },
  { id: 'hmacsha512', name: 'HMAC-SHA512', hash: (i) => CryptoJS.HmacSHA512(i, 'key').toString() },
];

const HashGenerator: React.FC = () => {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string>('all');
  const [results, setResults] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { copy } = useClipboard();

  const items = useMemo(
    () => [
      { value: 'all', label: 'All algorithms' },
      ...ALGORITHMS.map((a) => ({ value: a.id, label: a.name })),
    ],
    [],
  );

  useEffect(() => {
    if (!input) {
      setResults({});
      return;
    }
    const next: Record<string, string> = {};
    const list =
      selected === 'all'
        ? ALGORITHMS
        : ALGORITHMS.filter((a) => a.id === selected);
    for (const algo of list) {
      try {
        next[algo.id] = algo.hash(input);
      } catch (err) {
        console.error(`Error generating ${algo.name}:`, err);
        next[algo.id] = `Error generating ${algo.name}`;
      }
    }
    setResults(next);
  }, [input, selected]);

  const handleCopy = (text: string, id: string) => {
    copy(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Stack gap="6">
      <Card variant="elevated" size="md">
        <CardBody>
          <Stack gap="5">
            <Stack gap="2">
              <Inline justify="between" align="center">
                <Label htmlFor="hash-input">Text to hash</Label>
                {input && (
                  <Button
                    variant="ghost"
                    colorScheme="neutral"
                    size="sm"
                    leftIcon={<X size={14} />}
                    onClick={() => setInput('')}
                  >
                    Clear
                  </Button>
                )}
              </Inline>
              <Textarea
                id="hash-input"
                value={input}
                onChange={setInput}
                placeholder="Enter text to generate hashes…"
                rows={4}
              />
            </Stack>

            <Stack gap="2">
              <Label htmlFor="hash-algo">Hash algorithm</Label>
              <Select
                id="hash-algo"
                value={selected}
                onValueChange={setSelected}
                items={items}
                aria-label="Hash algorithm"
              />
            </Stack>
          </Stack>
        </CardBody>
      </Card>

      {!input ? (
        <Alert status="info" variant="soft">
          <AlertDescription>
            Enter text above to generate hash values.
          </AlertDescription>
        </Alert>
      ) : (
        <Stack gap="3">
          <Heading level={2} size="lg" weight="semibold">
            Hash results
          </Heading>
          {Object.entries(results).map(([id, hash]) => {
            const info = ALGORITHMS.find((a) => a.id === id);
            const isError = hash.startsWith('Error');
            const isCopied = copiedId === id;
            return (
              <Card key={id} variant="outlined" size="sm">
                <CardHeader>
                  <Inline justify="between" align="center">
                    <CardTitle as="h3">{info?.name || id}</CardTitle>
                    <Button
                      variant={isCopied ? 'solid' : 'soft'}
                      colorScheme={isCopied ? 'success' : 'accent'}
                      size="sm"
                      disabled={isError}
                      leftIcon={isCopied ? <Check size={16} /> : <Copy size={16} />}
                      onClick={() => handleCopy(hash, id)}
                    >
                      {isCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </Inline>
                </CardHeader>
                <CardBody>
                  {isError ? (
                    <Alert status="danger" variant="soft">
                      <AlertDescription>{hash}</AlertDescription>
                    </Alert>
                  ) : (
                    <Text
                      as="div"
                      style={{
                        wordBreak: 'break-all',
                        fontFamily: 'var(--cyn-font-mono, monospace)',
                      }}
                      size="sm"
                    >
                      <Code size="sm">{hash}</Code>
                    </Text>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

export default HashGenerator;
