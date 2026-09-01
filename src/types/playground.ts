export interface PlaygroundElement {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  dimensions: { w: number; h: number; d: number };
  ageGroup: '0-3' | '3-7' | '7+';
}

export interface PlaygroundManifest {
  elements: PlaygroundElement[];
}
