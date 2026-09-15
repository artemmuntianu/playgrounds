// Normalised coordinate (can be < 0.0 or > 1.0 for out-of-frame objects)
export interface Point2D {
  x: number;
  y: number;
}

// A single annotated shadow-casting object
export interface Annotation {
  id: string;
  category: "tree" | "structure" | "building" | "other";
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
  /**
   * Real-world depth of the object along the view axis, in centimetres (operator input, default
   * 100). The annotated silhouette is treated as the *near* face of a solid that extends
   * `depth_cm` further away from the camera, and the shadow of that whole volume is cast instead
   * of a zero-thickness billboard's. `0` (or missing) keeps the legacy flat-cutout behaviour.
   *
   * The engine is scale-invariant (everything is measured in units of the camera height C), so
   * the value is converted through `SHADOW_CONFIG.assumedCameraHeightM` — see `objectDepthOffset()`
   * in `lib/shadowProjection.ts`.
   */
  depth_cm?: number;
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
    /**
     * Operator tuning knob (0..1, default 0.8): overall strength of the sun light. Lower it
     * when a photo is originally too bright / the sunlight washes it out.
     */
    sun_light_strength?: number;
    /**
     * Operator tuning knob (0..1, default 0.55): peak alpha of the sun glow in the sky.
     * Lower it to tame a blown-out white hotspot around the sun.
     */
    sun_sky_glow?: number;
    /**
     * Operator tuning knob (0.2..4, default 1): scales the shadow penumbra. The engine derives the
     * softness from the projected shadow itself, so this is a taste knob only — lower it for
     * crisper shadows on an already-soft photo, raise it for a hazier, low-sun look.
     */
    penumbra_strength?: number;
  };
  annotations: Annotation[];
}

// Solar position result
export interface SolarPosition {
  azimuth_deg: number;   // degrees clockwise from North
  altitude_deg: number;  // degrees above horizon
}
