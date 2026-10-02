import { useState } from 'react';
import {
  Breadcrumb,
  IconButton,
  MetaList,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  TopBar,
} from '@/shared/ui';
import { IconSearch, IconSun } from '@/shared/ui/icons';
import { Row, Section } from '../Section';

export function NavigationSection() {
  const [tab, setTab] = useState('pages');
  const [soft, setSoft] = useState('a');
  return (
    <Section name="navigation" title="Navigation">
      <div className="overflow-hidden rounded-lg shadow-e1">
        <TopBar
          homeHref="#kit"
          breadcrumb={
            <Breadcrumb
              segments={[{ label: 'pdf', href: '#kit-pdf' }, { label: 'edit' }]}
            />
          }
          actions={
            <>
              <IconButton variant="ghost" label="Search" icon={IconSearch} />
              <IconButton variant="ghost" label="Theme" icon={IconSun} />
            </>
          }
        />
      </div>
      <Row label="Breadcrumb">
        <Breadcrumb
          segments={[
            { label: 'data', href: '#kit-data' },
            { label: 'json-viewer', href: '#kit-json' },
            { label: 'settings' },
          ]}
        />
      </Row>
      <Row label="MetaList">
        <MetaList items={['12 pages', '2.4 MB', 'PDF 1.7', 'edited today']} />
      </Row>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="pages">
          <Text size="sm" tone="muted">
            Line tabs with the accent indicator.
          </Text>
        </TabsContent>
      </Tabs>
      <Tabs value={soft} onValueChange={setSoft} variant="soft">
        <TabsList>
          <TabsTrigger value="a">Draw</TabsTrigger>
          <TabsTrigger value="b">Type</TabsTrigger>
          <TabsTrigger value="c">Upload</TabsTrigger>
        </TabsList>
      </Tabs>
    </Section>
  );
}
