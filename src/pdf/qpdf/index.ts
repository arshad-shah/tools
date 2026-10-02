export { qpdf } from './client';
export { qpdfToToolError } from './errors';
export type { PasswordRole, PdfInspection, QpdfPdfResult } from './handlers';
export type {
  EncryptOptions,
  OptimizeOptions,
  Permissions,
} from '@arshad-shah/qpdf-wasm';
export {
  mayBeEncrypted,
  preparePdf,
  unlockWithPassword,
  type PreparedPdf,
  type UnlockEngine,
} from './unlock';
