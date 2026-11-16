import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type LinkRest = Omit<ComponentProps<typeof Link>, 'to' | 'children'>;

/**
 * A link renderer backed by the router (client-side navigation), for the
 * old kit's `renderLink` props.
 * TODO(mig/rollout-pdf-workspace): only the PDF workspace still passes it;
 * delete this file when that branch merges.
 */
export const routerLink = ({
  href,
  children,
  ...rest
}: LinkRest & { href: string; children: ReactNode }) => (
  <Link to={href} {...rest}>
    {children}
  </Link>
);
