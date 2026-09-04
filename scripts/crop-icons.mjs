import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../data/playground-elements');
const outDir = path.resolve(__dirname, '../public/icons/equipment');
fs.mkdirSync(outDir, { recursive: true });

const T = 130;
const MAP = {
  // PACK 1 : existing catalog
  swings_single:      [1, 57, 203],
  swing_nest:         [1, 212, 203],
  seesaw:             [1, 57, 383],
  carousel:           [1, 212, 383],
  slide:              [1, 58, 644],
  ladder:             [1, 407, 203],
  wall_bars:          [1, 578, 203],
  monkey_bars:        [1, 410, 382],
  rope_net:           [1, 578, 382],
  pull_up_bar:        [1, 410, 644],
  climbing_wall:      [1, 578, 644],
  sandbox:            [1, 852, 203],
  busy_board:         [1, 852, 383],
  playhouse:          [1, 852, 516],
  abacus:             [1, 852, 651],
  bench:              [1, 1076, 203],
  trash_bin:          [1, 1076, 378],
  canopy:             [1, 1076, 561],

  // PACK 2
  zip_line:           [2, 57, 203],
  standing_spinner:   [2, 212, 203],
  spring_rider:       [2, 57, 383],
  climbing_dome:      [2, 212, 383],
  tunnel:             [2, 57, 644],
  gymnastic_rings:    [2, 410, 204],
  basketball_hoop:    [2, 578, 204],
  climbing_rope:      [2, 410, 383],
  balance_beam:       [2, 578, 383],
  slackline:          [2, 578, 644],
  step_stones:        [2, 410, 644],
  water_table:        [2, 852, 203],
  outdoor_chalkboard: [2, 852, 379],
  stone_path:         [2, 852, 518],
  telescope:          [2, 852, 651],
  drinking_fountain:  [2, 1076, 204],
  stroller_parking:   [2, 1076, 399],

  // PACK 3
  music_xylophone:    [3, 58, 204],
  tactile_panel:      [3, 212, 204],
  optical_illusion_panel: [3, 57, 383],
  tic_tac_toe_wall:   [3, 212, 383],
  in_ground_trampoline:[3, 407, 204],
  tire_obstacle_course:[3, 564, 204],
  rope_bridge:        [3, 407, 383],
  jump_rope_station:  [3, 563, 383],
  sitting_logs:       [3, 592, 644],
  stone_slide:        [3, 410, 643],
  natural_climbing_area:[3, 563, 644],
  sensory_garden_bed: [3, 721, 204],
  birdhouse_feeder:   [3, 922, 204],
  picnic_table_canopy:[3, 1075, 204],
  table_game_station: [3, 824, 658],
  pet_water_fountain: [3, 1099, 658],

  // PACK 4
  platform_swing:     [4, 212, 203],
  accessible_play_table:[4, 57, 383],
  large_print_panel:  [4, 57, 632],
  accessible_seating: [4, 212, 632],
  mini_slide:         [4, 411, 203],
  bee_spring_rider:   [4, 579, 203],
  crawling_tunnel:    [4, 411, 383],
  soft_play_modules:  [4, 578, 383],
  sand_play_table:    [4, 411, 632],
  toddler_book_nook:  [4, 578, 632],
  sound_effect_board: [4, 853, 218],
  musical_pipes:      [4, 853, 516],
  u_rack_bike_parking:[4, 1090, 374],
  modern_park_light:  [4, 1090, 516],
  bike_repair_station:[4, 1090, 659],

  // PACK 5
  smart_gate:         [5, 58, 203],
  digital_game_screen:[5, 212, 203],
  interactive_path:   [5, 58, 383],
  ar_info_panel:      [5, 212, 383],
  kinetic_power_station:[5, 57, 632],
  cascade_stream:     [5, 411, 203],
  flower_sprinkler:   [5, 579, 203],
  water_wheel:        [5, 411, 383],
  market_stall:       [5, 578, 383],
  pedal_pump:         [5, 411, 632],
  amphitheater_stage: [5, 853, 219],
  lookout_tower:      [5, 853, 378],

  // PACK 6
  multisport_court:   [6, 58, 203],
  soccer_pitch:       [6, 212, 203],
  calisthenics_frame: [6, 58, 383],
  alphabet_panel:     [6, 411, 203],
  number_wall:        [6, 579, 203],
  compass_floor_design:[6, 411, 383],
  musical_notes_panel:[6, 579, 383],
  surveillance_camera:[6, 853, 523],
  dog_park_zone:      [6, 1091, 374],
  shade_structure:    [6, 1091, 674],
};

(async () => {
  const cache = {};
  async function open(pack) {
    if (!cache[pack]) {
      const f = path.join(src, `icon_pack_${pack}.jpg`);
      cache[pack] = { buf: fs.readFileSync(f), meta: await sharp(f).metadata() };
    }
    return cache[pack];
  }
  let count = 0;
  for (const [slug, [pack, x, y]] of Object.entries(MAP)) {
    const { buf, meta } = await open(pack);
    const cw = Math.min(T, meta.width - x);
    const ch = Math.min(T, meta.height - y);
    await sharp(buf)
      .extract({ left: x, top: y, width: cw, height: ch })
      .resize(100, 100, { fit: 'fill' })
      .png()
      .toFile(path.join(outDir, `${slug}.png`));
    count++;
  }
  console.log(`cropped ${count} icons`);
})();
