# Review: PR #83, P5-H Signing+ (`feat/p5-h-signing-plus`)

Reviewer: independent, read-only. Branch files are cited as `path:line` on `origin/feat/p5-h-signing-plus`. No tests were run: pkijs is not installed in the main checkout, and the RAM limits ruled out a worktree install. Every finding below comes from reading the code.

## Strengths

- **ByteRange is correct.** It excludes exactly the `/Contents` hex string including both brackets (`byte-range.ts:83-116`). The fixed-width placeholder is patched in place, so no offset moves. `insertSignature` refuses an over-long DER rather than truncating it.
- **The incremental writer is clean** (`incremental.ts`). The original bytes stay an exact prefix. The table and stream xref kinds are both handled, and the xref stream lists itself. `/Prev`, `/ID` and `/Info` are carried over and encrypted input is refused. `sign-pdf.test.ts` covers both xref kinds and a second signature that keeps the first one intact.
- **The CMS is right for PAdES-B-B** (`cms.ts`). It has contentType, messageDigest over the ByteRange content and signingCertificateV2 (ESSCertIDv2, default SHA-256), with no signingTime. Signed attributes are sorted into DER SET OF order and SHA-256 is used throughout. The timestamp imprint is taken over the SignerInfo signature value, as RFC 3161 and PAdES require.
- **Self-verification gates the save** (`sign-flow.ts:25-40`). The newest signature must be intact, valid and whole-document, and must have the expected signer hash, or nothing is saved.
- **Keys stay on the main thread** (WebCrypto). pdf-lib work happens in the edit worker, and so does verification (`export-stages/sign.ts:171-182`).
- **The verifier reports integrity and signature validity separately.** An unsupported or unreadable signature gets "could not be checked", not a false "Invalid". Trust is claimed only for chains anchored at a root the user imported. The label strings match the plan's honest-labels table exactly, and "Revocation status is not checked" is always shown.
- **The TSA client is careful** (`tsa.ts`). It requires https, uses `credentials: 'omit'`, uses a random nonce from `crypto.getRandomValues`, and checks the imprint, the nonce and the hash algorithm. Only a hash leaves the device.
- **The self-signed serial** comes from `crypto.getRandomValues` (`self-signed.ts:70-71`).
- **There is an independent check with openssl** (`test/signing-openssl.test.ts`). The test parses the ByteRange with its own regex, runs `openssl cms -verify` on ECDSA and RSA signatures, and checks a one-byte tamper against both openssl and the app's own verifier. It also checks a chained signer against `-CAfile` and runs qpdf `check` and pdf.js.

## Issues

### Critical

None. The signing path is sound: the ByteRange, the placeholder, the CMS attributes, the incremental prefix, and a second signature that keeps the first valid. Self-verification blocks a bad save.

### Important

**I1. The verifier does not check that the ByteRange gap is exactly the /Contents string** (`src/pdf/sign/pades/verify.ts:215-234`, `read-signatures.ts:79-96`). This is the signature-wrapping attack class (Mladenov et al., 2019).

- `verifyOne` checks only `a === 0`, `b <= c` and `c + d <= len`. It never checks that `bytes[b] === '<'`, `bytes[c-1] === '>'`, that only hex digits (or whitespace) lie between them, or that this gap is where this signature dictionary's own `/Contents` sits.
- So everything in `[b, c)` is unsigned and freely editable while the report still says intact, valid and "whole-document". An attacker can use a short CMS and fill the zero padding with `>> endobj 12 0 obj ... endobj`.
- pdf-lib parses objects linearly, and a later definition overrides an earlier one. Objects injected into the gap therefore override objects defined before them, both for the verifier and for the app's own pdf-lib export path. pdf.js, which follows the xref, renders the original. The label stays "Valid".
- Fix: in `verifyOne`, require `bytes[b] === 0x3c`, `bytes[c-1] === 0x3e`, and only hex digits or whitespace in between. Otherwise return `fail('The signed byte ranges do not match the signature value.')`. Ideally also check that the decoded hex equals `s.contents`. Add a tamper test that writes an object into the zero padding and expects "could not be checked" or "Invalid".

**I2. Chain building never checks basicConstraints or keyUsage on issuers** (`verify.ts:79-132`). This lets anyone holding an end-entity certificate mint "trusted" signers.

- `buildChain` accepts any certificate whose subject matches the issuer and whose signature verifies.
- The holder of any end-entity certificate under an imported root (`cA` false, with `digitalSignature` keyUsage only) can issue a certificate with any name. The panel then shows "Valid. Signed by {any CN}. The certificate chains to a root you imported."
- `addTrustedRoot` checks cA for the root (`trust.ts:41-68`), but intermediates are never checked. pathLenConstraint is ignored as well.
- Fix:
  - Every certificate used as an issuer, the imported anchor included, must have basicConstraints `cA` true.
  - It must have the keyCertSign keyUsage bit when keyUsage is present, and `pathLenConstraint` must be honoured.
  - Otherwise set `linksValid = false` (the "invalid-certificate" label).
  - Add a test: a leaf-signed "leaf2" under an imported root must not come out as trusted.

**I3. Timestamp time is believed without trusting the TSA, so a forged time can hide an expired certificate** (`timestamp-token.ts:30-35, 64`, `verify.ts:253-276`, `SignaturesPanel.tsx:71-72`).

- `checkTimestampToken` verifies only that the token is consistent with itself: the imprint, the TSTInfo digest, and the TSA's own signature with the certificate embedded in the token.
- Anyone can mint a token with a self-signed "TSA" and any `genTime`. The result is `source: 'timestamp'`, the device-clock note disappears, the panel says "Time from a timestamp server", and `genTime` is used for the validity check (`verify.ts:272-276`).
- The same holds with no token: the validity time is the signer-controlled `/M`.
- Consequence: an expired or not-yet-valid certificate that chains to an imported root is labelled "Valid. Signed by X. The certificate chains to a root you imported" instead of "expired-at-signing". That breaks the honest-labels requirement (R25 and plan H-12: validity must cover the signing time).
- Fix:
  - Treat the timestamp as verified only when the TSA certificate chains to an imported root (using I2's checks) and has the critical `id-kp-timeStamping` extended key usage. Otherwise keep `source: 'device-clock'` semantics, with a note such as "Timestamp from {TSA CN}, which is not trusted on this device".
  - When the time is not verified, check the chain's validity at both the claimed time and now, and flag it if either fails.
  - Also check that the token's eContentType is id-ct-TSTInfo.

**I4. The TSA request has no timeout and no response size cap** (`tsa.ts:68-89`). This came from the sub-review; I confirmed it at line 88.

- The only signal is the export's cancel signal, so a server that never answers hangs "Sign and export".
- `await res.arrayBuffer()` reads an unbounded body from a user-chosen server.
- Fix: `AbortSignal.any([o.signal, AbortSignal.timeout(20_000)])`. Reject when `Content-Length` is over 64 KiB, and stop the streamed read once it passes 64 KiB. The token must fit inside the 32 KiB `/Contents` anyway.

**I5. The photo pipeline decodes at full resolution before any limit** (`SignaturePhoto.tsx:49-53, 153-156, 217`, `photo/handlers.ts:13-24`, `photo/pipeline.ts:41`).

- `createImageBitmap(file)` decodes at full size. The worker then allocates a full-size OffscreenCanvas and RGBA buffer, and only after that downscales to 1600.
- A 50-100 MP photo means 200-400 MB in the worker, decoded again on every change to the Contrast slider.
- There is also no file-size check on upload.
- Fix: reject files over about 25 MB. Use `createImageBitmap(src, { resizeWidth/resizeHeight, resizeQuality: 'high' })` so the longest side is at most 1600. Add a pixel cap in `handlers.clean`.

**I6. The typed signature text has no length limit** (`src/pdf/doc/ops/sign-params.ts:144-146`).

- The `kind: 'text'` branch checks only that the text is non-empty, while the block name and title have `MAX_TEXT`.
- Validators also run on autosave restore, so an unbounded string is accepted from storage.
- Fix: limit it to `MAX_TEXT`, or about 100 characters for a signature.

### Minor

- **M1.** The signer's `signingCertificateV2` is not checked during verification (`verify.ts:223-251`). PAdES requires the ESSCertIDv2 hash to equal the SHA-256 of the signer's certificate, which prevents certificate substitution. Fix: compare it, and report a problem when it is missing or different (for adbe.pkcs7 files, only when present).
- **M2.** There is no limit on the number of signatures verified (`verify.ts:317-318`). Each one copies and hashes up to the whole file, so a hostile PDF with thousands of distinct /Sig values costs N times the file size in the worker. Fix: verify at most about 50 and report "more signatures were not checked".
- **M3.** Self-verification does not require the timestamp to verify (`sign-flow.ts:32-38`). A token whose TSA signature fails is embedded and saved. Fix: when `o.timestamp` was set, also require `newest.timestampValid === true`.
- **M4.** SHA-1 digests are accepted with no note (`verify.ts:51`). Fix: add the note "This signature uses SHA-1, which is no longer considered secure."
- **M5.** A fixed placeholder size with no retry (`export-stages/sign.ts:169`, `byte-range.ts:124-129`). A .p12 with a long RSA-4096 chain plus a TSA token that carries its own chain can exceed 32 KiB, and the user then gets "did not fit". Fix: on that error, retry once with double the size, or size it from the certificate lengths plus a margin.
- **M6.** An existing field given as an inline dictionary in `/Fields` (`reuse.ref === null`) silently falls through to creating a new `SignatureN` field (`sign-pdf.ts:207, 218`). Fix: rewrite the parent array, or refuse with a clear message.
- **M7.** `hasSignatures` is a raw scan for "/ByteRange" (`export-stages/sign.ts:47-55`). It misses signature dictionaries stored in object streams, which is uncommon but legal for some writers, and can hit the text inside a stream. Fix: use `readSignatures` through the worker, or accept and document the limit.
- **M8.** TSA nonce DER (`tsa.ts:55-63`). In about 1 in 256 requests the nonce starts with 0x00 followed by a byte below 0x80, which is not minimal DER and can cause a false "did not match". Fix: `nonce[0] = (nonce[0] & 0x7f) | 0x40`.
- **M9.** TSA `statusStrings` are shown verbatim and without a length limit (`tsa.ts:101`). Fix: truncate them.
- **M10.** `SignedBadge` shows the "good" accent for signatures that are self-signed, untrusted or changed after signing (`SignedBadge.tsx:32, 40`). Fix: use accent only when the signature is intact, valid and whole-document, and a warning tone otherwise.
- **M11.** The "device clock" wording is misleading for documents signed elsewhere (`SignaturesPanel.tsx:71-73`). Fix: "Time stated by the signer (not verified)".
- **M12.** React keys can collide in `SignaturesPanel.tsx:81, 84, 134` (field names and problem strings can repeat). The contrast field in `SignaturePhoto.tsx:203-206` has a hard-coded id plus a redundant `aria-label`. Fix: use the index in the keys, `useId()` for the id, and drop the `aria-label`.
- **M13.** `Math.min(...xs)` over every outline point (`src/pdf/sign/ink.ts:51-61`) can throw a RangeError on a very long drawing. Fix: compute the bounds with a loop.
- **M14.** Secrets stay in memory after a failed export (`ExportDialog.tsx:139`). The identity is cleared only on success, and JS strings cannot be wiped. Fix: clear it on a non-retryable failure, or reword the copy to "kept in this tab until you close the dialog".
- **M15.** The openssl suite skips silently when openssl is missing (`test/signing-openssl.test.ts:84`). Fix: fail when `process.env.CI` is set. Also add a second-signature case to the openssl test, verifying the first ByteRange of a twice-signed file.
- **M16.** H-14 plan gap: there is no Settings-menu item "Clear trusted roots". It exists only inside `TrustedRootsDialog`. Fix: add the item, or record the deviation.
- **M17.** Spec drift: CSP `connect-src *` (G11, `scripts/csp.ts:20`) allows the user-chosen TSA, but the spec table at `specs/...design.md:750` still says `'self'`. Fix: update the spec text. The PR itself does not change the CSP.

Not issues (checked):

- DocMDP is not claimed (B-B only), and SigFlags 3 is set.
- The key is non-extractable for signing, and the PKCS#8 bytes and password bytes are zero-filled (`pkcs12.ts:82-94, 224`, `self-signed.ts:165, 276-279`).
- There is no Math.random, no key in the op log, autosave, IndexedDB or URLs, and no new `console` output of secrets.
- The TSA `fetch` is the only new network call. It is opt-in and labelled ("sends one request to the server below").
- The camera tracks are stopped, and the photo is never uploaded.
- The G17 warning appears in the dialog (`DigitalSignatureSection.tsx:107-115`). The summary page is refused for documents that are already signed.

## Plan coverage

| Task                                                  | Status     | Notes                                                                             |
| ----------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| H-1 deps, error codes, icons                          | Done       | Licences recorded                                                                 |
| H-2 ink pen                                           | Done       | M13                                                                               |
| H-3 typed gallery                                     | Done       | I6                                                                                |
| H-4 photo clean-up                                    | Done       | I5 (input size)                                                                   |
| H-5 vector tracing                                    | Done       | In-house; IoU test                                                                |
| H-6 camera and photo flow                             | Done       | Tracks stopped, permission messages                                               |
| H-7 initials and blocks                               | Done       |                                                                                   |
| H-8 smart placement                                   | Done       | Announcements, `[`/`]` rotation                                                   |
| H-9 incremental writer and ByteRange                  | Done       | Table and stream xref tested                                                      |
| H-10 PKCS#12 and self-signed                          | Done       | Non-extractable, WebCrypto                                                        |
| H-11 CMS, TSA, sign stage, self-verify                | Done       | I4, M3, M5, M8                                                                    |
| H-12 verification and trusted roots                   | Done, gaps | I1, I2, I3, M1, M2                                                                |
| H-13 summary page                                     | Done       | Refused when already signed                                                       |
| H-14 signing UI                                       | Mostly     | M10, M11, M16                                                                     |
| H-15 openssl, tamper, e2e, visual                     | Done       | M15; tamper tests in verify, tsa and e2e                                          |
| Spec success criterion 5 (real and honest signatures) | Partial    | I1, I2 and I3 break "never claims trust or validity falsely" in adversarial cases |
| Criterion 6 / R25 (single opt-in network call)        | Met        | M17 is a spec text fix only                                                       |

## Verdict

**Request changes: 0 Critical, 6 Important, 17 Minor.**

The signing side is correct and independently checked with openssl. The verifier is where the gaps are. I1 (gap check), I2 (basicConstraints) and I3 (TSA trust and the validity time) each let a hostile file earn a "Valid" or "Trusted" label it should not get, which is the core promise of R25's honest labels. I4 to I6 are robustness limits. All six are small, local fixes with clear tests. The Minors can go to the backlog, apart from M3, which is a one-line change.
