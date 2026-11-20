import { goString } from './literals';
import {
  effectiveHeaders,
  headerValue,
  withoutContentType,
  type CurlRequest,
} from './model';
import type { Generated } from './targets';

const CHECK = ['if err != nil {', '\tlog.Fatal(err)', '}'];

/** Go `net/http`, as a whole program. */
export function toGo(req: CurlRequest): Generated {
  const notes: string[] = [];
  const imports = new Set(['fmt', 'io', 'log', 'net/http']);
  const body: string[] = [];
  let reader = 'nil';
  const b = req.body;
  let headers = effectiveHeaders(req);

  if (b.kind === 'data') {
    imports.add('strings');
    body.push(`body := strings.NewReader(${goString(b.text)})`);
    reader = 'body';
  } else if (b.kind === 'file') {
    imports.add('os');
    body.push(
      `file, err := os.Open(${goString(b.path)})`,
      ...CHECK,
      'defer file.Close()',
    );
    reader = 'file';
  } else if (b.kind === 'form') {
    imports.add('bytes').add('mime/multipart');
    if (headerValue(headers, 'content-type'))
      notes.push(
        'The multipart Content-Type comes from the writer, which adds the boundary.',
      );
    headers = withoutContentType(headers);
    body.push('body := &bytes.Buffer{}', 'writer := multipart.NewWriter(body)');
    let n = 0;
    for (const f of b.fields) {
      if (!f.file) {
        body.push(
          `if err := writer.WriteField(${goString(f.name)}, ${goString(f.value)}); err != nil {`,
          '\tlog.Fatal(err)',
          '}',
        );
        continue;
      }
      imports.add('os');
      n++;
      const name = f.filename ?? f.value.split(/[/\\]/).pop() ?? f.value;
      if (f.type) {
        imports.add('net/textproto');
        const disp = `form-data; name="${f.name}"; filename="${name}"`;
        body.push(
          `h${n} := make(textproto.MIMEHeader)`,
          `h${n}.Set("Content-Disposition", ${goString(disp)})`,
          `h${n}.Set("Content-Type", ${goString(f.type)})`,
          `part${n}, err := writer.CreatePart(h${n})`,
        );
      } else
        body.push(
          `part${n}, err := writer.CreateFormFile(${goString(f.name)}, ${goString(name)})`,
        );
      body.push(
        ...CHECK,
        `file${n}, err := os.Open(${goString(f.value)})`,
        ...CHECK,
        `if _, err := io.Copy(part${n}, file${n}); err != nil {`,
        '\tlog.Fatal(err)',
        '}',
        `file${n}.Close()`,
      );
    }
    body.push(
      'if err := writer.Close(); err != nil {',
      '\tlog.Fatal(err)',
      '}',
    );
    reader = 'body';
  }

  body.push(
    `req, err := http.NewRequest(${goString(req.method)}, ${goString(req.url)}, ${reader})`,
    ...CHECK,
  );
  const seen = new Set<string>();
  for (const h of headers) {
    const key = h.name.toLowerCase();
    body.push(
      `req.Header.${seen.has(key) ? 'Add' : 'Set'}(${goString(h.name)}, ${goString(h.value)})`,
    );
    seen.add(key);
  }
  if (b.kind === 'form')
    body.push('req.Header.Set("Content-Type", writer.FormDataContentType())');
  if (req.auth)
    body.push(
      `req.SetBasicAuth(${goString(req.auth.user)}, ${goString(req.auth.pass)})`,
    );
  body.push('');

  if (req.insecure) {
    imports.add('crypto/tls');
    body.push(
      'client := &http.Client{',
      '\tTransport: &http.Transport{',
      '\t\tTLSClientConfig: &tls.Config{InsecureSkipVerify: true},',
      '\t},',
      '}',
    );
  } else body.push('client := &http.Client{}');
  body.push(
    'resp, err := client.Do(req)',
    ...CHECK,
    'defer resp.Body.Close()',
    'respBody, err := io.ReadAll(resp.Body)',
    ...CHECK,
    'fmt.Printf("%s\\n", respBody)',
  );

  const code = [
    'package main',
    '',
    'import (',
    ...[...imports].sort().map((i) => `\t"${i}"`),
    ')',
    '',
    'func main() {',
    ...body.map((l) => (l ? `\t${l}` : '')),
    '}',
  ].join('\n');
  return { code, notes };
}
