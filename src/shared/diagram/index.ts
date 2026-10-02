/**
 * Framework-free diagram engine (spec §6), ported from arshad-shah/verql
 * src/renderer/src/components/er (MIT, Copyright (c) 2026 Arshad Shah).
 * Pipeline: buildCards, layout, route, SpatialIndex.build, paint; toSvg and
 * toPng are alternate outputs. Large diagrams lay out in a worker.
 */
export * from './model';
export * from './fonts';
export * from './metrics';
export * from './layout';
export * from './route';
export * from './viewport';
export * from './spatial-index';
export * from './theme-bridge';
export * from './paint';
export * from './export';
export * from './layout-core';
export {
  createLayoutClient,
  layoutInWorker,
  type LayoutClient,
} from './layout-client';
export * from './navigation';
export * from './minimap';
export { DiagramController, type ControllerEvents } from './controller';
