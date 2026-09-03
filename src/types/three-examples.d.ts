// Ambient type declarations for `three/examples/jsm/controls/*`.
// The installed `three@0.185` ships `.js` example files but no `.d.ts`, and TS does not fall
// back to `@types/three@0.169` for these subpaths (because `three` carries an `exports` map).
// These declarations mirror the real `@types/three` types so the legacy `PlaygroundViewer`
// editor type-checks without introducing `any`. Imports live INSIDE each `declare module` block
// so this file stays an ambient (script) file — a top-level import would turn it into a module
// and the `declare module` blocks would become augmentations of non-resolvable modules.
declare module 'three/examples/jsm/controls/OrbitControls' {
  import type { Camera, Object3D } from 'three';

  export interface OrbitControlsEventMap {
    change: Record<string, never>;
    start: Record<string, never>;
    end: Record<string, never>;
  }

  export class OrbitControls {
    constructor(object: Camera, domElement?: HTMLElement | Document);
    enabled: boolean;
    target: Object3D;
    update(): void;
    saveState(): void;
    reset(): void;
    dispose(): void;
  }
}

declare module 'three/examples/jsm/controls/TransformControls' {
  import type { Camera, Object3D } from 'three';

  export interface TransformControlsEventMap {
    change: Record<string, never>;
    'dragging-changed': { value: boolean; mode: string };
    objectChange: Record<string, never>;
  }

  export class TransformControls extends Object3D<TransformControlsEventMap> {
    constructor(camera: Camera, domElement?: HTMLElement | Document);
    object: Object3D | undefined;
    enabled: boolean;
    axis: string | null;
    mode: 'translate' | 'rotate' | 'scale';
    attach(object: Object3D): this;
    detach(): this;
    getHelper(): Object3D;
    setSize(width: number, height: number): void;
    dispose(): void;
  }
}
