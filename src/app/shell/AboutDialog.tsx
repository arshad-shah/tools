import {
  Button,
  DescriptionList,
  Dialog,
  Link,
  Stack,
} from '@arshad-shah/cynosure';
import { Logo } from '@/shared/surfaces/logo/Logo';
import { formatBuildStamp, REPO_URL } from '../footerUtils';
import { getEnabledTools } from '../registry';

const AUTHOR = 'Arshad Shah';

/** What the old page footer said: the build, the tool count, the author. */
export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const stamp = formatBuildStamp(
    __BUILD_SHA__,
    __BUILD_DATE__,
    import.meta.env.DEV,
  );
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="About tools"
      description="Private tools that run in your browser. Nothing you open is uploaded."
      actions={
        <Button
          variant="solid"
          tone="accent"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>
      }
    >
      <Stack gap="6">
        <Logo animateCaret={false} label="tools" />
        <DescriptionList
          layout="inline"
          divided
          items={[
            { term: 'Tools', detail: String(getEnabledTools().length) },
            {
              term: 'Build',
              detail:
                stamp.href && stamp.sha ? (
                  <Link href={stamp.href} external>
                    {stamp.label}
                  </Link>
                ) : (
                  stamp.label
                ),
            },
            {
              term: 'Source',
              detail: (
                <Link href={REPO_URL} external>
                  github.com/arshad-shah/tools
                </Link>
              ),
            },
            {
              term: 'Copyright',
              detail: `${new Date().getFullYear()} ${AUTHOR}`,
            },
          ]}
        />
      </Stack>
    </Dialog>
  );
}
