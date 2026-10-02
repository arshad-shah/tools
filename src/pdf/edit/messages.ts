/**
 * The safety net behind PdfDropzone's password flow: only reached when
 * encrypted bytes slip past it. Its own module, so the render worker can use
 * it without pulling pdf-lib into its bundle.
 */
export const ENCRYPTED_MESSAGE =
  'This PDF is password-protected and must be unlocked first.';

export const XFA_MESSAGE =
  'This PDF uses an XFA form, which is not supported. Only standard (AcroForm) forms can be filled.';
