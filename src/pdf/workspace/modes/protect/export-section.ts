import { protectionOf } from '@/pdf/doc/ops/protect';
import type { ExportOptionSection } from '../../export-options';
import { ProtectExportSection } from './ProtectExportSection';

/** Export dialog "Password protection" (shown while protection is on). */
export const PROTECT_EXPORT_SECTION: ExportOptionSection = {
  id: 'protect',
  order: 40,
  title: 'Password protection',
  // The dialog tests pass a bare DocumentApi: no view, no protection.
  visible: (doc) => !!doc.view && protectionOf(doc.view)?.enabled === true,
  Component: ProtectExportSection,
  secret: ['password', 'confirmPassword', 'ownerPassword'],
};
