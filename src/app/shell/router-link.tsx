import type { LinkRenderProps } from '@arshad-shah/cynosure';
import { Link } from 'react-router-dom';

/**
 * Cynosure's `renderLink` through React Router: every link component
 * (Link, Button and IconButton links, Card, ListRow, Breadcrumbs, SideNav)
 * navigates in the app. The props are the component's own: its class,
 * data attributes and click handler stay on the element.
 */
export function renderRouterLink({ href, ...rest }: LinkRenderProps) {
  return <Link to={href ?? ''} {...rest} />;
}
