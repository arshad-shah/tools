import type { ReactNode } from 'react';

/** Router-agnostic link renderer: the app passes one that renders its router Link. */
export interface RenderLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
  'aria-current'?: 'page';
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}
export type RenderLink = (props: RenderLinkProps) => ReactNode;

/** Plain anchor; used when no router link renderer is supplied. */
export const defaultRenderLink: RenderLink = ({ href, children, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
);
