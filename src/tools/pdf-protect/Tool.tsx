import {
  Button,
  Card,
  Checkbox,
  Grid,
  GridItem,
  Notice,
  Select,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { fileLock } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import type { PdfInputFile } from '@/pdf/intake/use-pdf-intake';
import { qpdf } from '@/pdf/qpdf';
import { usePdfDocument } from '@/pdf/render';
import { ChosenFile } from '@/pdf/ui/ChosenFile';
import { PdfIntake } from '@/pdf/ui/PdfIntake';
import { JobProgress, ResultCard, type ResultFile } from '@/pdf/ui/ResultCard';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import {
  buildEncryptOptions,
  validatePasswords,
  type PasswordInput,
  type PermissionChoices,
} from '@/pdf/edit/permissions';
import { usePermissionSettings } from './store';
import { useHandoff } from '@/shared/lib/handoff';

const PRINT_ITEMS = [
  { value: 'none', label: 'Not allowed' },
  { value: 'low', label: 'Low resolution' },
  { value: 'full', label: 'High resolution' },
];

type Flag = Exclude<keyof PermissionChoices, 'printing'>;

const FLAGS: { key: Flag; label: string }[] = [
  { key: 'modify', label: 'Allow editing' },
  { key: 'copy', label: 'Allow copying text and images' },
  { key: 'annotate', label: 'Allow comments' },
  { key: 'fillForms', label: 'Allow filling forms' },
  { key: 'assemble', label: 'Allow page assembly' },
];

const EMPTY: PasswordInput = {
  userPassword: '',
  confirmPassword: '',
  ownerPassword: '',
};

/**
 * Protect PDF (redesign spec, file tool pattern): drop a PDF, set its
 * passwords and permissions, protect it, download the protected copy.
 */
export default function ProtectTool() {
  // Files dropped on a hub land here once (spec §5.3).
  const handed = useHandoff();
  const [file, setFile] = useState<PdfInputFile | null>(null);
  // Passwords live in component state only, never in the store.
  const [passwords, setPasswords] = useState<PasswordInput>(EMPTY);
  // A password handed over from the Password Generator (spec 10) fills both
  // fields, and survives picking the file it is meant for.
  const secret = useHandoff(
    (p) => p.kind === 'text' && p.mime === 'application/vnd.tools.secret',
  );
  const [takenSecret, setTakenSecret] = useState<typeof secret>(null);
  const [handedPassword, setHandedPassword] = useState('');
  if (secret !== takenSecret) {
    setTakenSecret(secret);
    if (secret?.kind === 'text') {
      setHandedPassword(secret.text);
      setPasswords({
        ...EMPTY,
        userPassword: secret.text,
        confirmPassword: secret.text,
      });
    }
  }
  const fresh = (): PasswordInput =>
    handedPassword
      ? {
          ...EMPTY,
          userPassword: handedPassword,
          confirmPassword: handedPassword,
        }
      : EMPTY;
  const settings = usePermissionSettings();
  const choices: PermissionChoices = {
    printing: settings.printing,
    modify: settings.modify,
    copy: settings.copy,
    annotate: settings.annotate,
    fillForms: settings.fillForms,
    assemble: settings.assemble,
  };
  const { doc, loading, error } = usePdfDocument(file);

  const job = useJob(
    async (
      ctx,
      source: PdfInputFile,
      pw: PasswordInput,
      perms: PermissionChoices,
    ): Promise<ResultFile> => {
      const { bytes, warnings } = await qpdf.encrypt(
        source.bytes,
        buildEncryptOptions(pw, perms),
        ctx.signal,
      );
      return {
        name: deriveFilename(source.name, 'protected', 'pdf'),
        bytes,
        detail: ['AES-256', ...warnings].join('. '),
      };
    },
  );

  // Passwords never outlive their use: cleared with the file and after a
  // successful protect.
  const pick = (picked: PdfInputFile) => {
    job.reset();
    setPasswords(fresh());
    setFile(picked);
  };
  const clearFile = () => {
    job.reset();
    setPasswords(EMPTY);
    setHandedPassword('');
    setFile(null);
  };
  const protect = async (source: PdfInputFile) => {
    if (await job.run(source, passwords, choices)) {
      setPasswords(EMPTY);
      setHandedPassword('');
    }
  };
  const setPassword = (key: keyof PasswordInput, value: string) => {
    job.reset();
    setPasswords((p) => ({ ...p, [key]: value }));
  };
  const setPermission = (patch: Partial<PermissionChoices>) => {
    job.reset();
    settings.setPermissions(patch);
  };

  const problem = validatePasswords(passwords);
  // Nothing typed yet is not worth an error message.
  const showProblem =
    problem &&
    (passwords.userPassword ||
      passwords.confirmPassword ||
      passwords.ownerPassword);

  const busy = job.status === 'running';
  const pages = doc
    ? `${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}`
    : loading
      ? 'Opening'
      : undefined;

  return (
    <Stack gap="6">
      {file ? (
        <ChosenFile
          name={file.name}
          size={file.size}
          detail={pages}
          disabled={busy}
          onClear={clearFile}
        />
      ) : (
        <PdfIntake initialFiles={handed} onFiles={(files) => pick(files[0])} />
      )}
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      {file?.wasEncrypted ? (
        <Notice tone="info">
          Its current protection is replaced by the new password.
        </Notice>
      ) : null}

      {file && doc ? (
        <Grid columns={{ base: 1, lg: 3 }} gap="6" align="start">
          <GridItem span={{ base: 1, lg: 2 }}>
            <Stack gap="6">
              <Card as="section" title="Passwords">
                <Stack gap="5">
                  <TextField
                    label="Password to open"
                    type="password"
                    revealable
                    autoComplete="new-password"
                    value={passwords.userPassword}
                    onChange={(v) => setPassword('userPassword', v)}
                  />
                  <TextField
                    label="Confirm password"
                    type="password"
                    revealable
                    autoComplete="new-password"
                    value={passwords.confirmPassword}
                    onChange={(v) => setPassword('confirmPassword', v)}
                    error={showProblem ? problem.message : undefined}
                  />
                  <TextField
                    label="Permissions password (optional)"
                    description="Leave blank to lock the permissions with a random password nobody knows."
                    type="password"
                    revealable
                    autoComplete="new-password"
                    value={passwords.ownerPassword}
                    onChange={(v) => setPassword('ownerPassword', v)}
                  />
                </Stack>
              </Card>
              <Card as="section" title="Permissions">
                <Stack gap="4">
                  <Select
                    label="Printing"
                    value={choices.printing}
                    options={PRINT_ITEMS}
                    onChange={(v) =>
                      setPermission({
                        printing: v as PermissionChoices['printing'],
                      })
                    }
                  />
                  {FLAGS.map(({ key, label }) => {
                    // Comments imply form filling in PDF readers.
                    const implied = key === 'fillForms' && choices.annotate;
                    return (
                      <Checkbox
                        key={key}
                        label={label}
                        description={
                          implied
                            ? 'Included when comments are allowed.'
                            : undefined
                        }
                        checked={choices[key] || implied}
                        disabled={implied}
                        onChange={(v) => setPermission({ [key]: v })}
                      />
                    );
                  })}
                </Stack>
              </Card>
            </Stack>
          </GridItem>
          <Card as="section" title="Protect">
            <Stack gap="5">
              <Text size="sm" tone="muted">
                Uses AES-256. PDF readers enforce the permissions; the file
                itself cannot stop a determined user from ignoring them.
              </Text>
              <JobProgress job={job} label="Encrypting" onCancel={job.cancel} />
              {busy ? null : (
                <Button
                  variant="solid"
                  tone="accent"
                  size="lg"
                  fullWidth
                  icon={fileLock}
                  disabled={!!problem}
                  onClick={() => void protect(file)}
                >
                  Protect PDF
                </Button>
              )}
            </Stack>
          </Card>
        </Grid>
      ) : null}

      {job.status === 'done' && job.result ? (
        <ResultCard files={[job.result]} />
      ) : null}
    </Stack>
  );
}
