import type { ExportOptionSection } from '../../export-options';
import { DigitalSignatureSection } from './DigitalSignatureSection';
import { signingBlocker, signingOn } from './digital-signature-options';

/** Export dialog "Digital signature" (plan H-14); always offered. */
export const DIGITAL_SIGNATURE_SECTION: ExportOptionSection = {
  id: 'digital-signature',
  order: 50,
  title: 'Digital signature',
  visible: () => true,
  Component: DigitalSignatureSection,
  // The certificate and key never outlive the export that used them (G25).
  secret: ['signature', 'signatureIdentity'],
  exportLabel: (o) => (signingOn(o) ? 'Sign and export' : null),
  blocker: (o, doc) => signingBlocker(o, doc.view),
};
