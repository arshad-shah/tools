import { Card, createTheme, CynosureTheme } from '@arshad-shah/cynosure';
import React, { useMemo } from 'react';

export interface ColourSurfaceProps {
  /** The surface colour (any CSS colour). */
  bg: string;
  /** The text colour on it. */
  fg: string;
  /** Names the surface for assistive technology. */
  label: string;
  children?: React.ReactNode;
}

/**
 * A Card in the user's own colours: a scoped Cynosure theme whose surface
 * and ink are `bg` and `fg`, fixed to one mode so the page's light or dark
 * mode does not change them. Cynosure has no colour sample of its own
 * (docs/cynosure-gaps.md).
 */
export function ColourSurface({ bg, fg, label, children }: ColourSurfaceProps) {
  const theme = useMemo(() => {
    const colours = {
      bg,
      surface: bg,
      surfaceRaised: bg,
      soft: bg,
      ink: fg,
      muted: fg,
      line: fg,
    };
    return createTheme({
      mode: 'light',
      palettes: { light: colours, 'light-contrast': colours },
    });
  }, [bg, fg]);
  return (
    <CynosureTheme theme={theme} mode="light" target="self">
      <Card variant="surface" aria-label={label}>
        {children}
      </Card>
    </CynosureTheme>
  );
}
