import { useMemo, useState } from 'react';
import {
  BytesView,
  CodeSurface,
  KeyValueEditor,
  TextInputPanel,
  type CodeFold,
  type KeyValueRow,
  type TextSample,
} from '@/shared/ui';
import { Row, Section } from '../Section';

const ORDER = `{
  "id": "ord_20260914_0042",
  "status": "shipped",
  "total": 129.95,
  "paid": true,
  "coupon": null,
  "items": [
    { "sku": "KB-104", "qty": 1 },
    { "sku": "MS-221", "qty": 1 }
  ],
}`;

const LOG = Array.from(
  { length: 24 },
  (_, i) =>
    `2026-09-14T09:${String(i * 2).padStart(2, '0')}:00Z ${
      i === 17 ? 'ERROR payment webhook timed out' : 'INFO GET /api/orders 200'
    }`,
).join('\n');
const LOG_FOLDS: CodeFold[] = [
  { fromLine: 3, toLine: 15, label: 'Unchanged requests' },
];

const SAMPLES: TextSample[] = [
  {
    label: 'Order',
    value: '{\n  "id": "ord_20260914_0042",\n  "total": 129.95\n}',
  },
  { label: 'Empty array', value: '[]' },
];

/** "Hello, tools!" then a little binary header. */
const BYTES = new Uint8Array([
  0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x74, 0x6f, 0x6f, 0x6c, 0x73, 0x21,
  0x0a, 0x00, 0x7f, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
  0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0xff, 0xfe, 0x01, 0x02,
]);

/** Built from parts so no scanner reads it as a real credential. */
const BEARER = ['Bearer', ['demo', 'only', '9c41e2'].join('.')].join(' ');

const AVATAR = new File(
  [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
  'avatar.png',
  {
    type: 'image/png',
    lastModified: 0,
  },
);

const HEADERS: KeyValueRow[] = [
  { id: 'h-accept', enabled: true, key: 'Accept', value: 'application/json' },
  {
    id: 'h-auth',
    enabled: true,
    key: 'Authorization',
    value: BEARER,
    type: 'secret',
  },
  { id: 'h-trace', enabled: false, key: 'X-Trace', value: '1' },
  {
    id: 'h-file',
    enabled: true,
    key: 'avatar',
    value: '',
    type: 'file',
    file: AVATAR,
  },
];

export function EditorSection() {
  const [json, setJson] = useState(ORDER);
  const [regex, setRegex] = useState('^ord_(\\d{8})_(\\d{4})$');
  const [input, setInput] = useState(SAMPLES[0].value);
  const [headers, setHeaders] = useState(HEADERS);
  const output = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(input));
    } catch {
      return '';
    }
  }, [input]);
  const statusStart = ORDER.indexOf('"shipped"');
  return (
    <Section name="editor" title="Editor and text">
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 lg:grid-cols-2">
        <Row label="CodeSurface: json, error marker, added line, match range">
          <CodeSurface
            value={json}
            onChange={setJson}
            language="json"
            label="Order JSON"
            lineNumbers
            markers={[
              {
                line: 10,
                column: 4,
                message: 'Trailing comma before the closing brace',
                severity: 'error',
              },
            ]}
            lineDecorations={[{ line: 5, kind: 'added' }]}
            ranges={[
              {
                start: statusStart,
                end: statusStart + '"shipped"'.length,
                kind: 'match',
              },
            ]}
            maxHeight={280}
            className="w-full"
          />
        </Row>
        <Row label="CodeSurface: read-only log with a fold">
          <CodeSurface
            value={LOG}
            language="log"
            label="Server log"
            readOnly
            lineNumbers
            folds={LOG_FOLDS}
            lineDecorations={[{ line: 18, kind: 'removed' }]}
            maxHeight={280}
            className="w-full"
          />
        </Row>
      </div>
      <Row label="CodeSurface: single-line regex">
        <div className="w-full max-w-md">
          <CodeSurface
            value={regex}
            onChange={setRegex}
            language="regex"
            label="Pattern"
            singleLine
          />
        </div>
      </Row>
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 lg:grid-cols-2">
        <Row label="TextInputPanel: samples, encodings">
          <TextInputPanel
            value={input}
            onChange={setInput}
            language="json"
            label="JSON input"
            accept=".json,application/json"
            samples={SAMPLES}
            encodingOptions={['utf-8', 'windows-1252', 'utf-16le']}
            minHeight={160}
            maxHeight={220}
            className="w-full"
          />
        </Row>
        <Row label="TextInputPanel: read-only output">
          <TextInputPanel
            value={output}
            onChange={() => {}}
            language="json"
            label="Minified output"
            readOnly
            downloadName="order.min.json"
            minHeight={160}
            maxHeight={220}
            className="w-full"
          />
        </Row>
      </div>
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0">
        <Row label="BytesView: hex">
          <BytesView
            bytes={BYTES}
            ariaLabel="File bytes in hex"
            maxHeight={160}
            className="w-full"
          />
        </Row>
        <Row label="BytesView: binary, 8 bytes per row">
          <BytesView
            bytes={BYTES}
            mode="binary"
            bytesPerRow={8}
            ariaLabel="File bytes in binary"
            maxHeight={160}
            className="w-full"
          />
        </Row>
      </div>
      <Row label="KeyValueEditor: HTTP headers with a secret, a disabled row and a file">
        <KeyValueEditor
          rows={headers}
          onChange={setHeaders}
          allowSecret
          allowFiles
          keyLabel="Header"
          valueLabel="Value"
          ariaLabel="Request headers"
          className="w-full"
        />
      </Row>
    </Section>
  );
}
