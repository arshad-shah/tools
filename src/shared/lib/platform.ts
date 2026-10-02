/** Platform probes shared by the kit (Kbd, hotkeys, motion-aware UI). */

interface NavigatorUAData {
  platform?: string;
}

/** True on macOS, iPadOS and iOS: "Mod" means Command there. */
export const isMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData })
    .userAgentData;
  const platform = uaData?.platform || navigator.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
};
