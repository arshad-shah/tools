import React, { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { Sized } from './positioned';

export type DevicePreset = 'phone' | 'tablet' | 'desktop';
export interface DeviceSize {
  width: number;
  height: number;
}

/**
 * CSS px viewports: phone and desktop match the visual-test sizes; tablet is
 * a current 10.9 inch tablet in portrait (820 by 1180), not the older
 * 768 by 1024.
 */
const PRESETS: Record<DevicePreset, DeviceSize & { name: string }> = {
  phone: { name: 'Phone', width: 390, height: 844 },
  tablet: { name: 'Tablet', width: 820, height: 1180 },
  desktop: { name: 'Desktop', width: 1280, height: 800 },
};

export interface DeviceFrameProps {
  preset: DevicePreset | DeviceSize;
  className?: string;
  children: React.ReactNode;
}

/**
 * Shows content at a device's viewport size, captioned with that size
 * ("Phone, 390 by 844"). Wider than its container, it scrolls.
 */
export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  preset,
  className,
  children,
}) => {
  const id = useId();
  const { name, width, height } =
    typeof preset === 'string'
      ? PRESETS[preset]
      : { name: 'Custom', ...preset };
  const caption = `${name}, ${Math.round(width)} by ${Math.round(height)}`;
  return (
    <figure
      aria-labelledby={id}
      className={cn('flex min-w-0 flex-col items-center gap-2', className)}
    >
      <figcaption id={id} className="text-sm text-fg-muted">
        {caption}
      </figcaption>
      <div className="max-w-full overflow-auto rounded-xl border-4 border-line-strong bg-surface shadow-e2">
        <Sized
          data-viewport=""
          width={width}
          height={height}
          className="overflow-auto bg-canvas"
        >
          {children}
        </Sized>
      </div>
    </figure>
  );
};
DeviceFrame.displayName = 'DeviceFrame';
