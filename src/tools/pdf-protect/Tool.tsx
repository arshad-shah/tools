import React, { useState } from 'react';
import { IconLock } from '@/shared/ui/icons';
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Text,
  type SelectItem,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import { usePdfDocument } from '@/pdf/render';
import { qpdf } from '@/pdf/qpdf';
import {
  JobPanel,
  PageThumb,
  PdfFileHeader,
  ResultFiles,
  type PdfInputFile,
  type ResultFile,
} from '@/pdf/components';
import {
  buildEncryptOptions,
  validatePasswords,
  type PasswordInput,
  type PermissionChoices,
} from '@/pdf/edit/permissions';
import { usePermissionSettings } from './store';
import { useHandoff } from '@/shared/lib/handoff';

const PRINT_ITEMS: SelectItem[] = [
  { value: 'none', label: 'Not allowed' },
  { value: 'low', label: 'Low resolution' },
  { value: 'full', label: 'High resolution' },
];

type Flag = Exclude<keyof PermissionChoices, 'printing'>;

const FLAGS: { key: Flag; id: string; label: string }[] = [
  { key: 'modify', id: 'pp-modify', label: 'Allow editing' },
  { key: 'copy', id: 'pp-copy', label: 'Allow copying text and images' },
  { key: 'annotate', id: 'pp-annotate', label: 'Allow comments' },
  { key: 'fillForms', id: 'pp-forms', label: 'Allow filling forms' },
  { key: 'assemble', id: 'pp-assemble', label: 'Allow page assembly' },
];

const EMPTY: PasswordInput = {
  userPassword: '',
  confirmPassword: '',
  ownerPassword: '',
};

const ProtectTool: React.FC<ToolProps> = () => {
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
        detail: ['AES-256', ...warnings].join(' · '),
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

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          <PdfFileHeader
            initialFiles={handed}
            file={file}
            onFile={pick}
            onClear={clearFile}
            loading={loading}
            error={error}
          />
          {file && doc && (
            <>
              <div className="flex items-center gap-3">
                <PageThumb
                  docId={doc.docId}
                  pageIndex={0}
                  page={doc.pages[0]}
                  width={56}
                  label="Page 1"
                />
                <Text size="sm" tone="muted">
                  {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                  {file.wasEncrypted &&
                    ' · its current protection is replaced by the new password'}
                </Text>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Stack gap="2">
                  <Label htmlFor="pp-user">Password to open</Label>
                  <Input
                    id="pp-user"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.userPassword}
                    onChange={(v) => setPassword('userPassword', v)}
                  />
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="pp-confirm">Confirm password</Label>
                  <Input
                    id="pp-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.confirmPassword}
                    onChange={(v) => setPassword('confirmPassword', v)}
                  />
                </Stack>
                <Stack gap="2">
                  <Label htmlFor="pp-owner">
                    Permissions password (optional)
                  </Label>
                  <Input
                    id="pp-owner"
                    type="password"
                    autoComplete="new-password"
                    value={passwords.ownerPassword}
                    onChange={(v) => setPassword('ownerPassword', v)}
                  />
                  <Text size="sm" tone="muted">
                    Leave blank to lock the permissions with a random password
                    nobody knows.
                  </Text>
                </Stack>
              </div>
              {showProblem && (
                <Text size="sm" className="text-danger" role="status">
                  {problem.message}
                </Text>
              )}
              <Stack gap="3">
                <Stack gap="2">
                  <Label htmlFor="pp-print">Printing</Label>
                  <Select
                    id="pp-print"
                    value={choices.printing}
                    items={PRINT_ITEMS}
                    onValueChange={(v) =>
                      setPermission({
                        printing: v as PermissionChoices['printing'],
                      })
                    }
                    className="max-w-64"
                  />
                </Stack>
                {FLAGS.map(({ key, id, label }) => {
                  // Comments imply form filling in PDF readers.
                  const implied = key === 'fillForms' && choices.annotate;
                  return (
                    <Inline key={key} gap="2" align="center" wrap>
                      <Checkbox
                        id={id}
                        checked={choices[key] || implied}
                        disabled={implied}
                        onCheckedChange={(v) => setPermission({ [key]: v })}
                      />
                      <Label htmlFor={id}>{label}</Label>
                      {implied && (
                        <Text size="sm" tone="muted">
                          Included when comments are allowed.
                        </Text>
                      )}
                    </Inline>
                  );
                })}
              </Stack>
              <Text size="sm" tone="muted">
                Uses AES-256. PDF readers enforce the permissions; the file
                itself cannot stop a determined user from ignoring them.
              </Text>
              <div>
                <Button
                  variant="primary"
                  leftIcon={<IconLock size="sm" />}
                  disabled={!!problem || job.status === 'running'}
                  onClick={() => void protect(file)}
                >
                  Protect PDF
                </Button>
              </div>
            </>
          )}
          <JobPanel job={job} onCancel={job.cancel} runningLabel="Encrypting">
            {job.result && <ResultFiles files={[job.result]} />}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default ProtectTool;
