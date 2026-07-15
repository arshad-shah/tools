import React from 'react';

/**
 * Static terminal "graph paper" backdrop: a faint fixed grid over the canvas,
 * with a soft accent glow bleeding from the top. No motion, no theme state —
 * the discipline that lets the command-line signature carry the personality.
 */
const AnimatedBackground: React.FC = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
    <div className="absolute inset-0 bg-canvas" />
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          'linear-gradient(to right, var(--color-fg) 1px, transparent 1px), linear-gradient(to bottom, var(--color-fg) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    />
    <div
      className="absolute inset-x-0 top-0 h-80"
      style={{
        background:
          'radial-gradient(60% 100% at 50% 0%, color-mix(in oklab, var(--color-accent) 10%, transparent), transparent 70%)',
      }}
    />
  </div>
);

export default AnimatedBackground;
