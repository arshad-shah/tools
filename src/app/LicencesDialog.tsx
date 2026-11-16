import { Dialog, Link, List } from '@arshad-shah/cynosure';
import { LICENCES } from './licences';

/**
 * The open-source licences of every bundled library and data set
 * (src/app/licences.ts), opened from the Help menu.
 */
export function LicencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const sorted = [...LICENCES].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Open-source licences"
      description="Libraries and data bundled with these tools, under their own licences."
    >
      <List
        label="Licences"
        marker="none"
        gap="sm"
        divided
        items={sorted.map((e) => ({
          id: e.name,
          label: (
            <Link href={e.url} external underline="hover">
              {e.name}
            </Link>
          ),
          description: e.note ? `${e.licence}. ${e.note}` : e.licence,
        }))}
      />
    </Dialog>
  );
}
