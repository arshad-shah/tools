import {
  FileDrop,
  Inline,
  LoadingDots,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  usePdfIntake,
  type PdfIntakeOptions,
} from '@/pdf/intake/use-pdf-intake';
import { acceptAttribute } from '@/shared/lib/files';
import { PasswordForm } from './PasswordForm';

export interface PdfIntakeProps extends PdfIntakeOptions {
  /** Busy elsewhere (working on the files): nothing can be added. */
  disabled?: boolean;
  /** Step 1 is the page's main action until something is added. */
  size?: 'sm' | 'md' | 'lg';
  prompt?: string;
  hint?: string;
  /** Extra "working" line, e.g. "Reading 2 files". */
  status?: string | null;
  /** Extra skipped-file messages from the host (pages could not be read). */
  skipped?: string[];
  onDismissSkipped?(): void;
}

/**
 * Step 1 of a PDF file tool (redesign spec, file tools): the FileDrop, what
 * is being read, what was skipped and why, and a password field for each
 * encrypted file, each next to the file it is about.
 */
export function PdfIntake({
  disabled,
  size = 'lg',
  prompt,
  hint,
  status,
  skipped = [],
  onDismissSkipped,
  ...options
}: PdfIntakeProps) {
  const intake = usePdfIntake(options);
  const messages = [...intake.rejected, ...skipped];
  const working = intake.busy ? 'Checking the files' : status;
  return (
    <Stack gap="4">
      <FileDrop
        multiple={options.multiple}
        accept={acceptAttribute(options.accept ?? ['pdf'])}
        size={size}
        disabled={disabled || intake.busy}
        hint={hint ?? 'Files stay on this device.'}
        labels={{
          prompt:
            prompt ??
            (options.multiple ? 'Drop PDFs here, or' : 'Drop a PDF here, or'),
        }}
        onFiles={intake.handle}
      />
      {working ? (
        <Inline gap="3" align="center" role="status">
          <LoadingDots size="sm" tone="muted" />
          <Text size="sm" tone="muted">
            {working}
          </Text>
        </Inline>
      ) : null}
      {messages.length ? (
        <Notice
          tone="danger"
          title={
            messages.length === 1
              ? 'A file was skipped'
              : `${messages.length} files were skipped`
          }
          dismissible={!!onDismissSkipped}
          onDismiss={onDismissSkipped}
        >
          <Stack gap="1">
            {messages.map((m) => (
              <Text key={m} as="p">
                {m}
              </Text>
            ))}
          </Stack>
        </Notice>
      ) : null}
      {intake.locked.map((l) => (
        <PasswordForm
          key={l.file.id}
          fileName={l.file.name}
          error={l.error}
          busy={l.busy}
          disabled={disabled}
          onSubmit={(pw) => intake.submit(l, pw)}
          onCancel={() => intake.skip(l.file.id)}
        />
      ))}
    </Stack>
  );
}
