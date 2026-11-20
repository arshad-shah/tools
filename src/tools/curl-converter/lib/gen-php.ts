import { phpString } from './literals';
import {
  effectiveHeaders,
  headerValue,
  withoutContentType,
  type CurlRequest,
} from './model';
import type { Generated } from './targets';

/** PHP with the curl extension. */
export function toPhp(req: CurlRequest): Generated {
  const notes: string[] = [];
  const opts: string[] = [
    `CURLOPT_URL => ${phpString(req.url)},`,
    'CURLOPT_RETURNTRANSFER => true,',
  ];
  const b = req.body;
  if (req.method === 'HEAD') opts.push('CURLOPT_NOBODY => true,');
  else if (req.method !== 'GET' || b.kind !== 'none')
    opts.push(`CURLOPT_CUSTOMREQUEST => ${phpString(req.method)},`);

  let headers = effectiveHeaders(req);
  const before: string[] = [];
  if (b.kind === 'form') {
    if (headerValue(headers, 'content-type'))
      notes.push(
        'The multipart Content-Type is left to curl, which adds the boundary.',
      );
    headers = withoutContentType(headers);
    const fields = b.fields.map((f) => {
      if (!f.file) return `    ${phpString(f.name)} => ${phpString(f.value)},`;
      const name = f.filename ?? f.value.split(/[/\\]/).pop() ?? f.value;
      return `    ${phpString(f.name)} => new CURLFile(${phpString(f.value)}, ${phpString(f.type ?? '')}, ${phpString(name)}),`;
    });
    opts.push(
      `CURLOPT_POSTFIELDS => [\n${fields.map((f) => `    ${f}`).join('\n')}\n    ],`,
    );
  } else if (b.kind === 'data') {
    opts.push(`CURLOPT_POSTFIELDS => ${phpString(b.text)},`);
  } else if (b.kind === 'file') {
    if (b.upload) {
      before.push(`$file = fopen(${phpString(b.path)}, 'rb');`);
      opts.push(
        'CURLOPT_UPLOAD => true,',
        'CURLOPT_INFILE => $file,',
        `CURLOPT_INFILESIZE => filesize(${phpString(b.path)}),`,
      );
    } else
      opts.push(
        `CURLOPT_POSTFIELDS => file_get_contents(${phpString(b.path)}),`,
      );
  }
  if (headers.length)
    opts.push(
      `CURLOPT_HTTPHEADER => [\n${headers
        .map((h) => `        ${phpString(`${h.name}: ${h.value}`)},`)
        .join('\n')}\n    ],`,
    );
  if (req.auth)
    opts.push(
      `CURLOPT_USERPWD => ${phpString(`${req.auth.user}:${req.auth.pass}`)},`,
    );
  if (req.compressed) opts.push("CURLOPT_ENCODING => '',");
  if (req.insecure)
    opts.push(
      'CURLOPT_SSL_VERIFYPEER => false,',
      'CURLOPT_SSL_VERIFYHOST => 0,',
    );
  if (req.location) opts.push('CURLOPT_FOLLOWLOCATION => true,');

  const code = [
    '<?php',
    '',
    ...before,
    '$ch = curl_init();',
    `curl_setopt_array($ch, [\n${opts.map((o) => `    ${o}`).join('\n')}\n]);`,
    '',
    '$response = curl_exec($ch);',
    'if ($response === false) {',
    '    throw new RuntimeException(curl_error($ch));',
    '}',
    'curl_close($ch);',
    '',
    'echo $response;',
  ].join('\n');
  return { code, notes };
}
