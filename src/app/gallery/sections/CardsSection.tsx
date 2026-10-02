import { useState } from 'react';
import {
  AutoGrid,
  Badge,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  CategoryCard,
  Statistic,
  ToolCard,
} from '@/shared/ui';
import {
  IconBinary,
  IconFileText,
  IconGlobe,
  IconMerge,
} from '@/shared/ui/icons';
import { Row, Section } from '../Section';

const TONES = [
  'accent',
  'neutral',
  'success',
  'warning',
  'danger',
  'info',
] as const;
const VARIANTS = ['soft', 'solid', 'outline'] as const;

export function CardsSection() {
  const [fav, setFav] = useState(true);
  return (
    <Section name="cards" title="Cards">
      <AutoGrid min={240} gap="3">
        <ToolCard
          href="#kit-merge"
          icon={IconMerge}
          title="Merge PDFs"
          description="Combine several PDFs into one, in the order you choose."
          tag="pdf"
          isNew
          favourite={{ active: fav, onToggle: () => setFav((f) => !f) }}
        />
        <ToolCard
          href="#kit-base64"
          icon={IconBinary}
          title="Base64"
          description="Encode and decode text and files."
          favourite={{ active: false, onToggle: () => {} }}
        />
        <CategoryCard
          href="#kit-web"
          icon={IconGlobe}
          label="Web"
          count={6}
          topTools={['URL parser', 'API request', 'JWT decode']}
        />
        <Card>
          <CardHeader>
            <CardTitle>Card</CardTitle>
            <CardDescription>Surface with the e1 elevation.</CardDescription>
          </CardHeader>
          <CardBody>
            <Statistic
              label="Pages"
              value="12"
              icon={<IconFileText size="sm" />}
            />
          </CardBody>
        </Card>
      </AutoGrid>
      {VARIANTS.map((v) => (
        <Row key={v} label={`Badge ${v}`}>
          {TONES.map((t) => (
            <Badge key={t} variant={v} tone={t}>
              {t}
            </Badge>
          ))}
        </Row>
      ))}
    </Section>
  );
}
