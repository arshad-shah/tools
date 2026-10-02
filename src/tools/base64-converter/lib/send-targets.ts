import type { BytesInsight } from './insight';

export interface SendTarget {
  toolId: string;
  label: string;
}

/**
 * Where decoded bytes can go (spec §10): JSON to the JSON Viewer, a JWT to
 * the JWT Decoder (text hand-offs), a raster image to the Image Compressor
 * (a file hand-off).
 */
export function sendTargets(insight: BytesInsight): SendTarget[] {
  if (insight.kind === 'json')
    return [{ toolId: 'json-and-xml-viewer', label: 'Open in JSON Viewer' }];
  if (insight.kind === 'jwt')
    return [{ toolId: 'jwt-decode', label: 'Open in JWT Decoder' }];
  if (insight.kind === 'image' && insight.mime !== 'image/svg+xml')
    return [{ toolId: 'image-optimizer', label: 'Open in Image Compressor' }];
  return [];
}
