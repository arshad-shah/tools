import { forwardRef } from 'react';
import './camera-video.css';

export interface CameraVideoProps {
  /** Accessible name of the video. */
  label: string;
  /** Not shown while the camera is off. */
  off?: boolean;
}

/**
 * The live camera picture and nothing else: a drawing surface for
 * `useCamera`'s stream. Controls around it belong to the page.
 */
export const CameraVideo = forwardRef<HTMLVideoElement, CameraVideoProps>(
  function CameraVideo({ label, off }, ref) {
    return (
      <video
        ref={ref}
        aria-label={label}
        muted
        playsInline
        className="tools-camera-video"
        hidden={off}
      />
    );
  },
);
