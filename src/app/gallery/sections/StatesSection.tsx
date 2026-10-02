import {
  Alert,
  AlertDescription,
  AlertTitle,
  DropZone,
  EmptyState,
  ErrorState,
  LoadingState,
  List,
  ListItem,
  Progress,
  StatusDot,
  Swatch,
} from '@/shared/ui';
import { ToolError } from '@/shared/lib/errors';
import { IconFileText } from '@/shared/ui/icons';
import { Row, Section } from '../Section';

const STATUSES = ['info', 'success', 'warning', 'danger'] as const;

export function StatesSection() {
  return (
    <Section name="states" title="States">
      <div className="grid gap-4 md:grid-cols-3">
        <EmptyState
          icon={IconFileText}
          title="No documents yet"
          description="Open a PDF to start."
        />
        <ErrorState
          error={
            new ToolError('ENCRYPTED', 'This PDF needs a password to open.')
          }
          actions={[
            { label: 'Enter password', onClick: () => {}, variant: 'primary' },
          ]}
        />
        <LoadingState
          label="Rendering pages"
          progress={{ done: 4, total: 12 }}
        />
      </div>
      <DropZone
        variant="hero"
        onFiles={() => {}}
        hint="PDF, images or text. Files stay in your browser."
      />
      <DropZone variant="inline" onFiles={() => {}} title="Add more files" />
      <div className="grid gap-3 md:grid-cols-2">
        {STATUSES.map((s) => (
          <Alert key={s} status={s}>
            <div>
              <AlertTitle>{s}</AlertTitle>
              <AlertDescription>
                Alert body text in the {s} tone.
              </AlertDescription>
            </div>
          </Alert>
        ))}
      </div>
      <Row label="Progress, StatusDot, Swatch, List">
        <div className="w-48">
          <Progress value={65} label="Upload" />
        </div>
        <StatusDot tone="accent" label="Saved" />
        <StatusDot tone="warning" label="Large file" />
        <StatusDot tone="danger" label="Failed" />
        <StatusDot tone="info" label="Suggested" />
        <StatusDot tone="muted" label="Idle" />
        <Swatch color="accent" label="Accent" />
        <Swatch color="#1d5fc4" label="Custom blue" size="sm" />
        <List>
          <ListItem>Kit list marker</ListItem>
          <ListItem>Never a character</ListItem>
        </List>
      </Row>
    </Section>
  );
}
