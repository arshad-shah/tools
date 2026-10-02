import { useParams } from 'react-router-dom';
import { getCategory } from '../categories';
import { Hub } from './Hub';
import NotFound from './NotFound';
import { PdfHub } from './PdfHub';

/** /:category: the hub, or NotFound for an unknown category. */
export default function HubRoute() {
  const category = getCategory(useParams().category ?? '');
  if (!category) return <NotFound />;
  return category.id === 'pdf' ? (
    <PdfHub />
  ) : (
    <Hub key={category.id} category={category} />
  );
}
