/** One output file of a PDF task, ready to download. */
export interface ResultFile {
  name: string;
  bytes: Uint8Array;
  /** Defaults to application/pdf. */
  mime?: string;
  detail?: string;
}
