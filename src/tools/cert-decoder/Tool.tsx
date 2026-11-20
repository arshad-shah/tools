import {
  Button,
  Card,
  EmptyState,
  LoadingDots,
  Stack,
  Text,
  TextArea,
} from '@arshad-shah/cynosure';
import { certificate, sparkles } from '@arshad-shah/cynosure/icons';
import { useEffect, useState } from 'react';
import { TextSourceActions } from '@/app/ui/text-source';
import { TransformLayout } from '@/app/ui/transform';
import { useTextFile } from '@/app/ui/use-text-file';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { notify } from '@/shared/lib/notify';
import { useNow } from '@/shared/lib/use-now';
import { CertCard } from './components/CertCard';
import {
  ChainSummary,
  CsrCard,
  ErrorCard,
  PrivateKeyCard,
  PublicKeyCard,
} from './components/OtherCards';
import { decodeInput, derToPem, type DecodedItem } from './lib/decode';
import { looksLikeText } from './lib/pem';

const ACCEPT = '.pem,.crt,.cer,.der,.csr,.req,.key,.pub,.p7b';
const MIMES = ['application/x-pem-file', 'application/pkix-cert'];
const MAX_BYTES = 1024 * 1024;

type State =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; items: DecodedItem[] }
  | { status: 'error'; error: ToolError };

/** Decodes the input whenever it changes; a newer input wins. */
function useDecoded(text: string): State {
  // The result and the text it is for: a result for older text means busy.
  const [result, setResult] = useState<{ text: string; state: State } | null>(
    null,
  );
  useEffect(() => {
    if (!text.trim()) return;
    let live = true;
    decodeInput(text).then(
      (items) => live && setResult({ text, state: { status: 'done', items } }),
      (e) =>
        live &&
        setResult({
          text,
          state: { status: 'error', error: toToolError(e) },
        }),
    );
    return () => {
      live = false;
    };
  }, [text]);
  if (!text.trim()) return { status: 'idle' };
  return result?.text === text ? result.state : { status: 'busy' };
}

/**
 * Certificate Decoder: PEM or DER certificates, chains, CSRs and keys,
 * decoded and checked in the browser. Nothing is fetched or sent.
 */
export default function CertDecoder() {
  const [text, setText] = useState('');
  const state = useDecoded(text);
  const now = useNow(60_000);
  const [example, setExample] = useState(false);

  // A binary .der or .cer file becomes PEM text.
  const onFile = (file: File) => {
    void readBytes(file).then((bytes) => {
      try {
        if (looksLikeText(bytes)) setText(new TextDecoder().decode(bytes));
        else setText(derToPem(bytes));
      } catch (e) {
        notify.error(toToolError(e, `Could not read ${file.name}`));
      }
    });
    return true;
  };
  const { onFiles } = useTextFile({
    onChange: setText,
    onFile,
    maxBytes: MAX_BYTES,
  });

  const tryExample = () => {
    setExample(true);
    void import('./lib/sample')
      .then((m) => m.sampleChainPem())
      .then(setText, (e) =>
        notify.error(toToolError(e, 'Could not build the example')),
      )
      .finally(() => setExample(false));
  };

  const input = (
    <Card as="section" title="Certificate, request or key">
      <Stack gap="5">
        <TextArea
          label="PEM or base64 DER"
          labelHidden
          monospace
          rows={10}
          maxRows={20}
          spellCheck={false}
          placeholder="Paste one or more PEM blocks (a chain, a CSR or a key), or open a .pem, .crt, .cer or .der file."
          value={text}
          onChange={setText}
          onFiles={onFiles}
          error={state.status === 'error' ? state.error.message : undefined}
        />
        <TextSourceActions
          value={text}
          onChange={setText}
          label="Input"
          accept={ACCEPT}
          onFile={onFile}
          maxBytes={MAX_BYTES}
          handoff={(p) => p.kind === 'text' && MIMES.includes(p.mime)}
          counts={false}
        />
        <Text size="sm" tone="muted">
          Decoded and checked in this browser. Nothing is uploaded, and OCSP,
          CRL and issuer URLs are never fetched.
        </Text>
      </Stack>
    </Card>
  );

  const items = state.status === 'done' ? state.items : [];
  const certs = items.filter(
    (i): i is Extract<DecodedItem, { kind: 'certificate' }> =>
      i.kind === 'certificate',
  );
  let certIndex = 0;
  const output =
    state.status === 'busy' || example ? (
      <Card as="section" title="Decoded">
        <LoadingDots label="Decoding" />
      </Card>
    ) : items.length ? (
      <Stack gap="5">
        {certs.length > 1 ? <ChainSummary certs={certs} /> : null}
        {items.map((item, i) => {
          switch (item.kind) {
            case 'certificate':
              certIndex++;
              return (
                <CertCard
                  key={i}
                  item={item}
                  now={now}
                  position={
                    certs.length > 1
                      ? `Certificate ${certIndex} of ${certs.length}`
                      : null
                  }
                />
              );
            case 'csr':
              return <CsrCard key={i} item={item} />;
            case 'public-key':
              return <PublicKeyCard key={i} item={item} />;
            case 'private-key':
              return <PrivateKeyCard key={i} item={item} />;
            case 'error':
              return <ErrorCard key={i} item={item} />;
          }
        })}
      </Stack>
    ) : (
      <Card as="section" title="Decoded">
        <EmptyState
          icon={certificate}
          title={
            state.status === 'error'
              ? 'Nothing to decode'
              : 'No certificate yet'
          }
          description={
            state.status === 'error'
              ? 'Fix the input on the left: what is wrong is shown under it.'
              : 'Paste a PEM certificate or chain, a CSR or a key, or open a file.'
          }
          actions={
            <Button variant="soft" icon={sparkles} onClick={tryExample}>
              Try an example
            </Button>
          }
        />
      </Card>
    );

  return <TransformLayout start={input} end={output} defaultSize={40} />;
}
