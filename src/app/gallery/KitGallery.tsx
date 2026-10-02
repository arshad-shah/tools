import { Heading, SegmentedControl, Stack, Text } from '@/shared/ui';
import { IconMonitor, IconMoon, IconSun } from '@/shared/ui/icons';
import { useTheme, type ThemePreference } from '@/shared/lib/theme';
import { ButtonsSection } from './sections/ButtonsSection';
import { CardsSection } from './sections/CardsSection';
import { ChartSection } from './sections/ChartSection';
import { ColourSection } from './sections/ColourSection';
import { DataSection } from './sections/DataSection';
import { DiagramSection } from './sections/DiagramSection';
import { DialogsSection } from './sections/DialogsSection';
import { EditorSection } from './sections/EditorSection';
import { GridSection } from './sections/GridSection';
import { IconsSection } from './sections/IconsSection';
import { InputsSection } from './sections/InputsSection';
import { KeysSection } from './sections/KeysSection';
import { ListsTreesSection } from './sections/ListsTreesSection';
import { MediaSection } from './sections/MediaSection';
import { NavigationSection } from './sections/NavigationSection';
import { OverlaysSection } from './sections/OverlaysSection';
import { PageOverlaysSection } from './sections/PageOverlaysSection';
import { FormFieldsSection } from './sections/FormFieldsSection';
import { PanelsSection } from './sections/PanelsSection';
import { WorkspaceBarsSection } from './sections/WorkspaceBarsSection';
import { DocumentSection } from './sections/DocumentSection';
import { PanesSection } from './sections/PanesSection';
import { ShellSection } from './sections/ShellSection';
import { StatesSection } from './sections/StatesSection';
import { WidgetsSection } from './sections/WidgetsSection';

/**
 * Dev-only kit gallery (decision G18): every kit primitive in its states,
 * in both themes. Each section is a visual-regression target.
 */
export default function KitGallery() {
  const { preference, setPreference } = useTheme();
  return (
    // A div, not main: the AppShell example renders the main landmark.
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <Stack gap="2">
        <Heading level={1} size="2xl">
          Kit gallery
        </Heading>
        <Text tone="muted">
          Development only. Every kit primitive, both themes.
        </Text>
        <SegmentedControl<ThemePreference>
          label="Theme"
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: 'System', icon: IconMonitor },
            { value: 'light', label: 'Light', icon: IconSun },
            { value: 'dark', label: 'Dark', icon: IconMoon },
          ]}
        />
      </Stack>
      <ButtonsSection />
      <InputsSection />
      <OverlaysSection />
      <DialogsSection />
      <NavigationSection />
      <ShellSection />
      <CardsSection />
      <DataSection />
      <DiagramSection />
      <StatesSection />
      <MediaSection />
      <KeysSection />
      <PageOverlaysSection />
      <FormFieldsSection />
      <PanelsSection />
      <WorkspaceBarsSection />
      <DocumentSection />
      <EditorSection />
      <ListsTreesSection />
      <GridSection />
      <ChartSection />
      <ColourSection />
      <PanesSection />
      <WidgetsSection />
      <IconsSection />
    </div>
  );
}
