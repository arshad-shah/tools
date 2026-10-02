import React from 'react';
import { IconBookOpen, IconZap } from '@/shared/ui/icons';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Textarea,
} from '@/shared/ui';

interface TestStringCardProps {
  testString: string;
  onTestStringChange: (text: string) => void;
  /** Offer "Generate sample" (a template is picked and the text is empty). */
  canGenerateSample: boolean;
  onGenerateSample: () => void;
}

export const TestStringCard: React.FC<TestStringCardProps> = ({
  testString,
  onTestStringChange,
  canGenerateSample,
  onGenerateSample,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center" wrap gap="2">
        <Inline gap="2" align="center">
          <IconBookOpen size="lg" />
          <CardTitle as="h2">Test string</CardTitle>
        </Inline>
        {canGenerateSample && (
          <Button
            variant="soft"
            size="sm"
            leftIcon={<IconZap size="sm" />}
            onClick={onGenerateSample}
          >
            Generate sample
          </Button>
        )}
      </Inline>
    </CardHeader>
    <CardBody>
      <Textarea
        value={testString}
        onChange={onTestStringChange}
        placeholder="Enter text to test against your regex…"
        rows={8}
        aria-label="Test string"
      />
    </CardBody>
  </Card>
);
