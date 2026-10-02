import { Link } from 'react-router-dom';
import type { RenderLink } from '@/shared/ui';

/** Kit link renderer backed by the router (client-side navigation). */
export const routerLink: RenderLink = ({ href, children, ...rest }) => (
  <Link to={href} {...rest}>
    {children}
  </Link>
);
