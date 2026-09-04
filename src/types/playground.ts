/** Bilingual text field (EN + PT) */
export interface LocalizedText {
  en: string;
  pt: string;
}

/** Named age group for a playground / equipment (replaces raw year ranges). */
export type AgeGroup =
  | 'toddlers'
  | 'preschool'
  | 'schoolchildren'
  | 'teenagers'
  | 'all';

/** High-level grouping of playground equipment. */
export type EquipmentCategoryId = 'ride_balance' | 'sport_complex' | 'development' | 'rest';

/** Concrete element types an operator can place on a playground. */
export type EquipmentTypeId =
  // ride & balance
  | 'swings_single' | 'swing_nest' | 'seesaw' | 'carousel' | 'slide'
  // sport & game complexes
  | 'ladder' | 'wall_bars' | 'monkey_bars' | 'rope_net' | 'pull_up_bar' | 'climbing_wall'
  // development
  | 'sandbox' | 'busy_board' | 'playhouse' | 'abacus'
  // rest
  | 'bench' | 'trash_bin' | 'canopy';

/** A single dot-marker on a photo (normalised 0..1 within the photo). */
export interface PhotoMarker {
  photo_id: string;
  x: number;
  y: number;
}

/** One piece of playground equipment listed by the operator. */
export interface PlaygroundEquipmentItem {
  id: string;                 // unique within the playground, e.g. "slide_1"
  type: EquipmentTypeId;      // category is derived from the catalog
  age_group?: AgeGroup | null;// optional; null = not set
  custom_name?: LocalizedText;// optional label override
  markers: PhotoMarker[];     // dot markers on "our 4 photos"
}

/** A single photo of a playground with its annotation scene */
export interface PlaygroundPhoto {
  /** Unique ID within the playground, e.g. "photo_1" */
  id: string;
  /** Path to the original image file relative to playground dir, e.g. "photos/photo_1.jpg" */
  filename: string;
  /** Path to the depth map file, e.g. "photos/photo_1_depth.png" (optional) */
  depth_map_filename?: string;
  /** Path to the semantic (3-colour) segmentation mask, e.g. "photos/photo_1_seg.png" (optional) */
  semantic_mask_filename?: string;
  /** Camera azimuth in degrees clockwise from North (for shadow photos) */
  camera_azimuth_deg?: number;
  /** Camera horizontal FOV in degrees (for shadow photos) */
  camera_fov_deg?: number;
  /** Scene annotation ID (matches a .json in scenes/) */
  scene_id?: string;
  /** True if this is an additional photo without shadow simulation */
  is_additional?: boolean;
}

/** Shadow/sun attributes for a playground */
export interface PlaygroundAttributes {
  /** Shadow coverage description. Examples: "High" / "Medium" / "Low" */
  shadow_coverage: LocalizedText;
  /** Surface temperature indicator. Examples: "Cool (~21°C)" / "Warm (~31°C)" */
  surface_temperature: LocalizedText;
  /** Target age group (a vocabulary id; label comes from AGE_GROUP_LABELS). */
  target_age_group: { id: AgeGroup };
}

/** Full playground entity stored in the file system */
export interface Playground {
  /** Unique slug ID, e.g. "sunrise_meadows_playground" (lowercase, underscores only) */
  id: string;
  /** Display name */
  name: LocalizedText;
  /** Short description (1-2 sentences) shown on cards */
  short_description: LocalizedText;
  /** Full description */
  full_description: LocalizedText;
  /** Location coordinates */
  latitude: number;
  longitude: number;
  /** Location name for display */
  location_name: LocalizedText;
  /** All photos of the playground (up to 4 shadow-enabled + additional photos) */
  photos: PlaygroundPhoto[];
  /** ID of the photo used as thumbnail on cards (must be one of photos[].id) */
  thumbnail_photo_id: string;
  /** Playground attributes shown in viewer */
  attributes: PlaygroundAttributes;
  /** Elements listed by the operator (equipment + photo markers) */
  equipment: PlaygroundEquipmentItem[];
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** ISO 8601 last update timestamp */
  updated_at: string;
}

/** Summary list used by list endpoints (no heavy data) */
export interface PlaygroundSummary {
  id: string;
  name: LocalizedText;
  short_description: LocalizedText;
  location_name: LocalizedText;
  thumbnail_url: string;
  attributes: PlaygroundAttributes;
  photo_count: number;
  created_at: string;
  /** Unique equipment types present (for the element-group filter). */
  equipment_types: EquipmentTypeId[];
  /** Age groups present among the playground's equipment (for the age filter). */
  equipment_age_groups: AgeGroup[];
}

// --- Legacy types kept for backward compatibility with PlaygroundViewer.tsx ---

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
