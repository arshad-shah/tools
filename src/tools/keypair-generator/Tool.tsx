import {
  Button,
  Card,
  DescriptionList,
  EmptyState,
  Inline,
  LoadingDots,
  Notice,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { close, download, key, shieldCheck } from '@arshad-shah/cynosure/icons';
import { useEffect, useMemo, useState } from 'react';
import { TransformLayout } from '@/app/ui/transform';
import { saveZip } from '@/shared/lib/download';
import { ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useJob } from '@/shared/state/useJob';
import { ExportList } from './components/ExportList';
import { SpecForm } from './components/SpecForm';
import { keypairClient } from './lib/client';
import { keyExports, zipEntries, zipName } from './lib/files';
import { supportsAlgorithm } from './lib/generate';
import { isSigning, specLabel, type Algorithm, type KeySpec } from './lib/spec';
import { sshKeygenLine } from './lib/ssh';
import { keypairSettings } from './settings';

const TOOL_ID = 'keypair-generator';
const PROBED: Algorithm[] = ['Ed25519', 'X25519'];

/**
 * Key Pair Generator (transform pattern): the key type beside the pair in
 * every format. Generated with Web Crypto off the main thread; held in
 * memory only.
 */
export default function KeypairGenerator() {
  const [spec, update] = keypairSettings.useSettings();
  const [comment, setComment] = useState('');
  const [unsupported, setUnsupported] = useState<ReadonlySet<Algorithm>>(
    () => new Set(),
  );

  useEffect(() => {
    let live = true;
    void Promise.all(
      PROBED.map(async (a) => [a, await supportsAlgorithm(a)] as const),
    ).then((r) => {
      if (live)
        setUnsupported(new Set(r.filter(([, ok]) => !ok).map(([a]) => a)));
    });
    return () => {
      live = false;
    };
  }, []);

  const job = useJob((ctx, s: KeySpec) =>
    keypairClient().generate(s, ctx.signal),
  );
  const material = job.result;
  const running = job.status === 'running';
  const blocked = unsupported.has(spec.algorithm);
  const generate = () => {
    if (!blocked) void job.run({ ...spec });
  };

  const exports = useMemo(
    () => (material ? keyExports(material, comment) : []),
    [material, comment],
  );

  const downloadAll = async () => {
    if (!material) return;
    try {
      await saveZip(zipEntries(material, comment), zipName(material));
    } catch (e) {
      notify.error(e instanceof ToolError ? e : 'Could not build the ZIP file');
    }
  };

  useToolCommands(TOOL_ID, [
    {
      id: 'generate',
      label: 'Generate a key pair',
      shortcut: 'Mod+Enter',
      enabled: !running && !blocked,
      run: generate,
    },
    {
      id: 'download-zip',
      label: 'Download all as ZIP',
      enabled: !!material,
      run: () => void downloadAll(),
    },
  ]);

  const options = (
    <Card as="section" title="Key type">
      <Stack gap="5">
        <SpecForm
          spec={spec}
          onChange={update}
          unsupported={unsupported}
          disabled={running}
        />
        {isSigning(spec.algorithm) ? (
          <TextField
            label="OpenSSH comment"
            description="Added to the end of the OpenSSH public key, often user@host."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={comment}
            onChange={setComment}
          />
        ) : null}
        {blocked ? (
          <Notice
            tone="danger"
            title={`${spec.algorithm} is not supported here`}
          >
            This browser cannot generate {spec.algorithm} keys with Web Crypto.
            Choose another algorithm, or try a current Chrome, Edge, Firefox or
            Safari.
          </Notice>
        ) : null}
        <Inline gap="2" align="center" wrap>
          <Button
            variant="solid"
            tone="accent"
            icon={key}
            aria-keyshortcuts="Control+Enter"
            disabled={running || blocked}
            onClick={generate}
          >
            {material ? 'Generate a new pair' : 'Generate key pair'}
          </Button>
          {running ? (
            <Button variant="ghost" icon={close} onClick={job.cancel}>
              Cancel
            </Button>
          ) : null}
        </Inline>
        <Notice tone="info" icon={shieldCheck} title="Generated on this device">
          Keys are made in this browser with Web Crypto and are never stored or
          sent anywhere. They are gone when you leave the page or generate
          again, so save what you need.
        </Notice>
      </Stack>
    </Card>
  );

  const output = running ? (
    <Card as="section" title="Your key pair">
      <Stack gap="3" align="center">
        <LoadingDots label="Generating the key pair" />
        <Text tone="muted">
          {spec.algorithm.startsWith('RSA') && spec.size === 4096
            ? 'RSA 4096 can take a few seconds.'
            : 'Generating.'}
        </Text>
      </Stack>
    </Card>
  ) : material ? (
    <Card
      as="section"
      title="Your key pair"
      actions={
        <Button
          size="sm"
          variant="soft"
          icon={download}
          onClick={() => void downloadAll()}
        >
          Download all as ZIP
        </Button>
      }
    >
      <Stack gap="6">
        <DescriptionList
          size="sm"
          items={[
            { id: 'type', term: 'Type', detail: specLabel(material.spec) },
            {
              id: 'kid',
              term: 'JWK thumbprint (kid, RFC 7638)',
              detail: material.kid,
            },
            ...(material.ssh
              ? [
                  {
                    id: 'ssh',
                    term: 'SSH fingerprint (ssh-keygen -l)',
                    detail: sshKeygenLine(
                      material.ssh,
                      material.ssh.fingerprint,
                      comment,
                    ),
                  },
                ]
              : []),
            {
              id: 'spki',
              term: 'Public key SHA-256 (SPKI, Base64)',
              detail: material.spkiFingerprint,
            },
          ]}
        />
        {material.ssh ? null : (
          <Text tone="muted" size="sm">
            Key agreement and encryption keys have no OpenSSH form: SSH keys
            sign.
          </Text>
        )}
        <ExportList exports={exports} />
      </Stack>
    </Card>
  ) : (
    <Card as="section" title="Your key pair">
      {job.error && job.status === 'error' ? (
        <Notice tone="danger" title="Could not generate the key pair">
          {job.error.message}
        </Notice>
      ) : (
        <EmptyState
          icon={key}
          title="No key pair yet"
          description="Choose a key type and generate: PEM, JWK and OpenSSH exports appear here."
          actions={
            <Button
              variant="soft"
              icon={key}
              disabled={blocked}
              onClick={generate}
            >
              Generate key pair
            </Button>
          }
        />
      )}
    </Card>
  );

  return <TransformLayout start={options} end={output} defaultSize={38} />;
}
