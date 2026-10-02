import { useNavigate } from 'react-router-dom';
import { RecentDocuments as RecentList } from '@/pdf/workspace/RecentDocuments';
import { useRecentDocuments } from '@/pdf/workspace/use-recent-documents';

/** Home's recent workspace documents (spec §5.2): up to 6, hidden when empty. */
export function RecentDocuments() {
  const navigate = useNavigate();
  const { docs, remove } = useRecentDocuments(6);
  if (!docs?.length) return null;
  return (
    <RecentList
      docs={docs}
      onOpen={(id) => navigate(`/pdf/edit?doc=${encodeURIComponent(id)}`)}
      onRemove={(id) => void remove(id)}
    />
  );
}
