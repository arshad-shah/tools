import { getCategory } from '../categories';
import { Hub } from './Hub';

/**
 * PDF hub: quick tasks and the interim PDF tools. P5-B adds the workspace
 * modes grid and workspace routing for a single dropped PDF.
 */
export function PdfHub() {
  const pdf = getCategory('pdf');
  if (!pdf) throw new Error('The pdf category is missing');
  return <Hub category={pdf} />;
}
