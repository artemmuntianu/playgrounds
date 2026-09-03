// Normalised coordinate (can be < 0.0 or > 1.0 for out-of-frame objects)
export interface Point2D {
  x: number;
  y: number;
}

// A single annotated shadow-casting object
export interface Annotation {
  id: string;
  category: "tree" | "structure" | "building" | "other";
  height_meters: number;       // real-world height in metres
  canopy_opacity: number;      // 0.0 (transparent) to 1.0 (opaque)
  ground_anchor: Point2D;      // base of object on the ground plane
  polygon_coordinates: Point2D[]; // silhouette/crown polygon (normalised)
  /**
   * Optional per-vertex ground projection ("open structure" / element mode).
   * When present with the same length as `polygon_coordinates`, each element is
   * the ground point vertically below the corresponding silhouette vertex.
   *
   * The engine then reconstructs every vertex at the depth of ITS OWN ground
   * point instead of assuming the whole silhouette is a flat vertical billboard
   * standing at the single `ground_anchor` depth. This is what makes slanted /
   * open members (swing legs, bars, roof edges) cast shadows from their true
   * ground position instead of across the object itself.
   */
  ground_projection_coordinates?: Point2D[];
  is_offscreen?: boolean;      // flag for objects located outside photo frame
}

// Top-level scene file (what gets saved/loaded as JSON)
export interface SceneAnnotation {
  scene_metadata: {
    scene_id: string;
    original_image_path: string;
    depth_map_path: string;
    camera_azimuth_deg: number;  // degrees clockwise from North
    camera_fov_deg?: number;      // horizontal field of view in degrees (default ~65)
    camera_pitch_deg?: number;    // camera tilt relative to horizon (default ~0)
    horizon_y?: number;           // Y-coordinate of the horizon line in pixels
  };
  annotations: Annotation[];
}

// Solar position result
export interface SolarPosition {
  azimuth_deg: number;   // degrees clockwise from North
  altitude_deg: number;  // degrees above horizon
}

// A rendered shadow layer for one annotation
export interface ShadowLayer {
  annotation_id: string;
  shadow_polygon: Point2D[]; // projected polygon before depth warp
  opacity: number;
}
