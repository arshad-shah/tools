import React from 'react';
import {
  IconCheckCircle,
  IconCopy,
  IconFileJson,
  IconLock,
  IconRefreshCw,
  IconTrash2,
} from '@/shared/ui/icons';

import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Inline,
  Label,
  Stack,
  Textarea,
} from '@/shared/ui';

interface TokenInputProps {
  jwt: string;
  setJwt: (jwt: string) => void;
  clear: () => void;
  handleSample: () => void;
  handleCopyJwt: () => void;
  copiedKey: string | null;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  jwt,
  setJwt,
  clear,
  handleSample,
  handleCopyJwt,
  copiedKey,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center" gap="2" wrap>
        <Inline gap="2" align="center">
          <IconLock size="lg" />
          <Label>JWT token</Label>
        </Inline>
        <Inline gap="2" wrap>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<IconFileJson size="sm" />}
            onClick={handleSample}
          >
            Sample
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={
              copiedKey === 'jwt' ? (
                <IconCheckCircle size="sm" />
              ) : (
                <IconCopy size="sm" />
              )
            }
            onClick={handleCopyJwt}
          >
            {copiedKey === 'jwt' ? 'Copied' : 'Copy'}
          </Button>
        </Inline>
      </Inline>
    </CardHeader>
    <CardBody>
      <Stack gap="3">
        <Textarea
          value={jwt}
          onChange={setJwt}
          placeholder="Paste your JWT token here…"
          rows={4}
          aria-label="JWT token"
        />
        <Inline gap="2" wrap>
          <Box className="flex-1">
            <Button
              variant="solid"
              leftIcon={<IconRefreshCw size="sm" />}
              onClick={() => setJwt(jwt)}
              className="w-full"
            >
              Decode token
            </Button>
          </Box>
          <Button
            variant="soft"
            leftIcon={<IconTrash2 size="sm" />}
            onClick={clear}
          >
            Clear
          </Button>
        </Inline>
      </Stack>
    </CardBody>
  </Card>
);
