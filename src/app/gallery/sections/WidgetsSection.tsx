import { useState } from 'react';
import {
  BitGrid,
  CameraCapture,
  CompareSlider,
  Meter,
  PrivacyNote,
  SandboxedHtml,
  SecretText,
  SendToMenu,
  ShareButton,
} from '@/shared/ui';
import { Row, Section } from '../Section';

const svgUrl = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">${body}</svg>`,
  )}`;

/** A landscape: smooth gradients before, a posterised version after. */
const BEFORE = svgUrl(
  '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b6cb0"/><stop offset="1" stop-color="#f6ad55"/></linearGradient><radialGradient id="u" cx="0.7" cy="0.45" r="0.25"><stop offset="0" stop-color="#fff5d6"/><stop offset="1" stop-color="#fff5d6" stop-opacity="0"/></radialGradient></defs><rect width="480" height="270" fill="url(#s)"/><rect width="480" height="270" fill="url(#u)"/><path d="M0 200 L90 120 L170 190 L260 100 L360 180 L480 130 L480 270 L0 270Z" fill="#2f4f3a"/><path d="M0 240 L120 200 L240 235 L360 205 L480 230 L480 270 L0 270Z" fill="#1c3326"/>',
);
const AFTER = svgUrl(
  '<rect width="480" height="90" fill="#2b6cb0"/><rect y="90" width="480" height="90" fill="#9b8c94"/><rect y="180" width="480" height="90" fill="#f6ad55"/><circle cx="336" cy="121" r="40" fill="#fff5d6"/><path d="M0 200 L90 120 L170 190 L260 100 L360 180 L480 130 L480 270 L0 270Z" fill="#2f4f3a"/><path d="M0 240 L120 200 L240 235 L360 205 L480 230 L480 270 L0 270Z" fill="#1c3326"/>',
);

const EMAIL_HTML = `<h1 style="font:600 18px system-ui;margin:0 0 8px">Your order has shipped</h1>
<p style="font:14px system-ui;margin:0 0 8px">Hi Ada, order <b>ORD-10042</b> left our warehouse today.</p>
<p style="font:14px system-ui;margin:0">Track it from your account page.</p>
<script>document.body.innerHTML = 'scripts never run here'</script>`;

/** Built from parts so no scanner reads it as a real credential. */
const DEMO_SECRET = ['demo', 'token', 'only', '7f3a9c21'].join('-');

const ORDER_JSON = JSON.stringify({ id: 'ord_20260914_0042', total: 129.95 });

export function WidgetsSection() {
  const [bits, setBits] = useState(0b1011_0110_0000_1111n);
  const [revealed, setRevealed] = useState(true);
  const [masked, setMasked] = useState(false);
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  return (
    <Section name="widgets" title="Widgets">
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 lg:grid-cols-2">
        <Row label="CompareSlider: fit, divider at 40 percent">
          <CompareSlider
            before={{ src: BEFORE }}
            after={{ src: AFTER }}
            labels={['Original', 'Posterised']}
            initial={0.4}
            label="Compare original and posterised"
            className="aspect-video w-full"
          />
        </Row>
        <Row label="SandboxedHtml: untrusted email, scripts blocked">
          <SandboxedHtml
            html={EMAIL_HTML}
            title="Email preview"
            baseCss="body{margin:12px;background:#ffffff;color:#0f1419}"
            className="h-40 w-full rounded-md border border-line"
          />
        </Row>
        <Row label="CameraCapture: off (never started in the gallery)">
          <div className="w-full">
            <CameraCapture
              active={camera}
              onActiveChange={setCamera}
              label="Camera preview"
              onError={(e) => setCameraError(e.message)}
            />
            {cameraError && (
              <p className="mt-1 text-sm text-danger">{cameraError}</p>
            )}
          </div>
        </Row>
        <Row label="Meter: continuous and segmented, auto tones">
          <div className="grid w-full grid-cols-1 gap-3 [&>*]:min-w-0">
            <Meter value={0.2} label="Password strength" valueText="Weak" />
            <Meter value={0.55} label="Password strength" valueText="Fair" />
            <Meter
              value={0.9}
              segments={5}
              label="Entropy"
              valueText="94 bits"
            />
            <Meter
              value={0.5}
              tone="ok"
              hideLabel
              label="Upload"
              valueText="Half done"
            />
          </div>
        </Row>
      </div>
      <Row label="BitGrid: 16 bits editable, 8 bits read-only">
        <div className="flex flex-col gap-3">
          <BitGrid
            bits={16}
            value={bits}
            onToggle={(i) => setBits((v) => v ^ (1n << BigInt(i)))}
            label="Flags"
          />
          <BitGrid bits={8} value={0xa5n} readOnly label="Status byte" />
        </div>
      </Row>
      <Row label="SecretText: revealed with copy, masked">
        <div className="flex flex-col gap-2">
          <SecretText
            value={DEMO_SECRET}
            revealed={revealed}
            onRevealedChange={setRevealed}
            copyable
            label="token"
          />
          <SecretText
            value={DEMO_SECRET}
            revealed={masked}
            onRevealedChange={setMasked}
            label="API key"
          />
        </div>
      </Row>
      <Row label="SendToMenu, ShareButton enabled and disabled with a reason">
        <SendToMenu
          sourceTool="json-and-xml-viewer"
          payload={() => ({
            kind: 'text',
            mime: 'application/json',
            text: ORDER_JSON,
            sourceTool: 'json-and-xml-viewer',
          })}
        />
        <ShareButton share={{ canShare: true, share: () => {} }} />
        <ShareButton
          share={{
            canShare: false,
            reason: 'Too large to share as a link (9,214 of 6,000 characters)',
            share: () => {},
          }}
        />
      </Row>
      <Row label="PrivacyNote: local and network">
        <div className="flex flex-col gap-1">
          <PrivacyNote variant="local" />
          <PrivacyNote variant="network">
            Your token is sent only to that host.
          </PrivacyNote>
        </div>
      </Row>
    </Section>
  );
}
