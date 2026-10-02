import { useContext } from 'react';
import {
  AppShell,
  Breadcrumb,
  HubLayout,
  IconButton,
  LayoutContext,
  SegmentedControl,
  Text,
  ToolCard,
  TopBar,
  type ShellLayout,
} from '@/shared/ui';
import {
  IconFileText,
  IconLayoutFocus,
  IconLayoutStandard,
  IconMerge,
  IconScissors,
  IconSearch,
} from '@/shared/ui/icons';
import { Row, Section } from '../Section';

/** Reads and sets the shell layout through LayoutContext. */
function LayoutSwitch() {
  const { layout, setLayout } = useContext(LayoutContext);
  return (
    <SegmentedControl<ShellLayout>
      label="Layout"
      size="sm"
      value={layout}
      onChange={setLayout}
      options={[
        { value: 'standard', label: 'Standard', icon: IconLayoutStandard },
        { value: 'focus', label: 'Focus', icon: IconLayoutFocus },
      ]}
    />
  );
}

function CurrentLayout() {
  const { layout } = useContext(LayoutContext);
  return (
    <Text size="sm" tone="muted">
      Layout from LayoutContext: {layout}
    </Text>
  );
}

/** AppShell, TopBar, Breadcrumb and HubLayout in fixed-size frames. */
export function ShellSection() {
  return (
    <Section name="shell" title="Shell">
      <Row label="AppShell with TopBar, Breadcrumb, aside and LayoutContext">
        <div className="h-72 w-full overflow-hidden rounded-lg shadow-e1">
          <AppShell
            className="h-full min-h-0"
            mainId="kit-shell-main"
            // SkipLinks: Tab into the frame to see it.
            skipLinks={[
              { href: '#kit-shell-main', label: 'Skip to the shell content' },
            ]}
            topBar={
              <TopBar
                compact
                homeHref="#kit"
                breadcrumb={
                  <Breadcrumb
                    segments={[
                      { label: 'pdf', href: '#kit' },
                      { label: 'edit' },
                    ]}
                  />
                }
                actions={
                  <>
                    <LayoutSwitch />
                    <IconButton
                      variant="ghost"
                      label="Search"
                      icon={IconSearch}
                    />
                  </>
                }
              />
            }
            aside={
              <div className="flex h-full w-36 flex-col gap-2 border-r border-line p-3">
                <Text size="xs" tone="subtle" mono>
                  pages
                </Text>
                <Text size="sm">Page 1</Text>
                <Text size="sm">Page 2</Text>
              </div>
            }
            asideLabel="Pages"
          >
            <div className="p-4">
              <CurrentLayout />
            </div>
          </AppShell>
        </div>
      </Row>
      <Row label="HubLayout with two groups">
        <div className="w-full overflow-hidden rounded-lg bg-canvas shadow-e1">
          <HubLayout
            icon={IconFileText}
            title="PDF"
            blurb="Edit, sign and convert PDFs. Files stay in your browser."
            className="max-w-none py-6"
            groups={[
              {
                id: 'quick',
                label: 'Quick tasks',
                children: (
                  <>
                    <ToolCard
                      href="#kit"
                      icon={IconMerge}
                      title="Merge"
                      description="Combine PDFs into one."
                    />
                    <ToolCard
                      href="#kit"
                      icon={IconScissors}
                      title="Split"
                      description="Pull pages out into new files."
                    />
                  </>
                ),
              },
              {
                id: 'more',
                label: 'More',
                children: (
                  <ToolCard
                    href="#kit"
                    icon={IconFileText}
                    title="PDF to text"
                    description="Extract the text layer."
                  />
                ),
              },
            ]}
          />
        </div>
      </Row>
    </Section>
  );
}
