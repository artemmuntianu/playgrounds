-- ============================================================================
-- Reference data tables: the single source of truth for the playground catalog
-- vocabulary (age groups, equipment categories, equipment catalog).
-- Previously this lived in src/lib/equipmentCatalog.ts.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`). It is
-- idempotent: re-running it upserts rows without duplicating them.
--
-- NOTE: the app reads/writes through the service-role key (`createServerClient`),
-- so RLS policies are not required for the current data flow.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Age groups (replaces AGE_GROUPS + AGE_GROUP_LABELS)
-- ----------------------------------------------------------------------------
create table if not exists public.age_groups (
  id         text primary key,            -- toddlers | preschool | schoolchildren | teenagers | all
  label_en   text not null,
  label_pt   text not null,
  sort_order integer not null
);

insert into public.age_groups (id, label_en, label_pt, sort_order) values
  ('toddlers',       'Toddlers (0-3)',       'Bebés (0-3)',        0),
  ('preschool',      'Preschool (3-7)',      'Pré-escolar (3-7)',  1),
  ('schoolchildren', 'Schoolchildren (7-12)','Escolares (7-12)',   2),
  ('teenagers',      'Teenagers (12+)',      'Adolescentes (12+)', 3),
  ('all',            'All ages',             'Todas as idades',    4)
on conflict (id) do update set
  label_en = excluded.label_en,
  label_pt = excluded.label_pt,
  sort_order = excluded.sort_order;

-- ----------------------------------------------------------------------------
-- Equipment categories (replaces EQUIPMENT_CATEGORIES + CATEGORY_LABELS + CATEGORY_COLORS)
-- ----------------------------------------------------------------------------
create table if not exists public.equipment_categories (
  id         text primary key,
  label_en   text not null,
  label_pt   text not null,
  color      text not null,               -- dot-marker colour (hex)
  sort_order integer not null
);

insert into public.equipment_categories (id, label_en, label_pt, color, sort_order) values
  ('ride_balance',        'Ride & balance',        'Balanço & equilíbrio',        '#f59e0b', 0),
  ('sport_complex',       'Sport & game',          'Desporto & jogo',             '#3b82f6', 1),
  ('development',         'Development',           'Desenvolvimento',             '#8b5cf6', 2),
  ('rest',                'Rest',                  'Descanso',                    '#10b981', 3),
  ('exploration',         'Exploration',           'Exploração',                  '#0ea5e9', 4),
  ('fitness',             'Fitness',               'Fitness',                     '#ef4444', 5),
  ('creativity',          'Creativity',            'Criatividade',                '#ec4899', 6),
  ('amenities',           'Amenities',             'Comodidades',                 '#64748b', 7),
  ('sensory_play',        'Sensory play',          'Brincadeira sensorial',       '#f97316', 8),
  ('adventure_course',    'Adventure course',      'Percurso de aventura',        '#22c55e', 9),
  ('nature_play',         'Nature play',           'Brincadeira na natureza',     '#84cc16', 10),
  ('gathering_hub',       'Gathering hub',         'Ponto de encontro',           '#78350f', 11),
  ('inclusive_play',      'Inclusive play',        'Brincadeira inclusiva',       '#6366f1', 12),
  ('toddler_zone',        'Toddler zone',          'Zona de bebés',               '#fb7185', 13),
  ('interactive_elements','Interactive elements',  'Elementos interativos',       '#06b6d4', 14),
  ('expanded_amenities',  'Expanded amenities',    'Comodidades alargadas',       '#78716c', 15),
  ('tech_play',           'Tech play',             'Brincadeira tecnológica',     '#7c3aed', 16),
  ('water_features',      'Water features',        'Elementos de água',           '#0284c7', 17),
  ('imaginative_stages',  'Imaginative stages',    'Palcos imaginativos',         '#a855f7', 18),
  ('sports_zone',         'Sports zone',           'Zona desportiva',             '#db2777', 19),
  ('learning_elements',   'Learning elements',     'Elementos de aprendizagem',   '#eab308', 20),
  ('maintenance_safety',  'Maintenance & safety',  'Manutenção e segurança',      '#475569', 21),
  ('functional_zones',    'Functional zones',      'Zonas funcionais',            '#0891b2', 22)
on conflict (id) do update set
  label_en = excluded.label_en,
  label_pt = excluded.label_pt,
  color = excluded.color,
  sort_order = excluded.sort_order;

-- ----------------------------------------------------------------------------
-- Equipment catalog (replaces EQUIPMENT_CATALOG + EquipmentCatalogEntry)
-- ----------------------------------------------------------------------------
create table if not exists public.equipment_catalog (
  type              text primary key,
  category_id       text not null references public.equipment_categories(id),
  label_en          text not null,
  label_pt          text not null,
  default_age_group text references public.age_groups(id),
  sort_order        integer not null
);

insert into public.equipment_catalog (type, category_id, label_en, label_pt, default_age_group, sort_order) values
  ('swings_single',        'ride_balance',        'Swing (single)',                    'Baloiço (individual)',            'toddlers',       0),
  ('swing_nest',           'ride_balance',        'Swing (nest)',                      'Baloiço (ninho)',                 'preschool',      1),
  ('swings_double',        'ride_balance',        'Swing (double)',                    'Baloiço (duplo)',                 'schoolchildren', 2),
  ('swings_triple',        'ride_balance',        'Swing (triple)',                    'Baloiço (triplo)',                'schoolchildren', 3),
  ('seesaw',               'ride_balance',        'Seesaw',                            'Balança',                         'toddlers',       4),
  ('carousel',             'ride_balance',        'Carousel',                          'Carrossel',                       'preschool',      5),
  ('slide',                'ride_balance',        'Slide',                             'Escorregador',                    'preschool',      6),
  ('ladder',               'sport_complex',       'Ladder',                            'Escada',                          'schoolchildren', 7),
  ('wall_bars',            'sport_complex',       'Wall bars',                         'Espaldar',                        'schoolchildren', 8),
  ('monkey_bars',          'sport_complex',       'Monkey bars',                       'Barras (macaco)',                 'schoolchildren', 9),
  ('rope_net',             'sport_complex',       'Rope climbing net',                 'Rede de escalada',                'schoolchildren', 10),
  ('pull_up_bar',          'sport_complex',       'Pull-up bar',                       'Barra fixa',                      'teenagers',      11),
  ('climbing_wall',        'sport_complex',       'Climbing wall',                     'Paredão de escalada',             'schoolchildren', 12),
  ('sandbox',              'development',         'Sandbox',                           'Caixa de areia',                  'toddlers',       13),
  ('busy_board',           'development',         'Busy board',                        'Painel sensorial',                'toddlers',       14),
  ('playhouse',            'development',         'Playhouse',                         'Casinha',                         'preschool',      15),
  ('abacus',               'development',         'Abacus',                            'Ábaco',                           'preschool',      16),
  ('bench',                'rest',                'Bench',                             'Banco',                           'all',            17),
  ('trash_bin',            'rest',                'Trash bin',                         'Caixote do lixo',                 'all',            18),
  ('canopy',               'rest',                'Canopy',                            'Toldo',                           'all',            19),
  ('zip_line',             'exploration',         'Zip line',                          'Slide de cabo',                   'schoolchildren', 20),
  ('standing_spinner',     'exploration',         'Standing spinner',                  'Carrossel de pé',                 'schoolchildren', 21),
  ('spring_rider',         'exploration',         'Spring rider',                      'Baloiço de mola',                 'toddlers',       22),
  ('climbing_dome',        'exploration',         'Climbing dome',                     'Cúpula de escalada',              'schoolchildren', 23),
  ('tunnel',               'exploration',         'Tunnel',                            'Túnel',                           'toddlers',       24),
  ('gymnastic_rings',      'fitness',             'Gymnastic rings',                   'Argolas ginásticas',              'schoolchildren', 25),
  ('basketball_hoop',      'fitness',             'Basketball hoop',                   'Cesto de basquete',               'teenagers',      26),
  ('climbing_rope',        'fitness',             'Climbing rope',                     'Corda de escalada',               'schoolchildren', 27),
  ('balance_beam',         'fitness',             'Balance beam',                      'Trave de equilíbrio',             'schoolchildren', 28),
  ('slackline',            'fitness',             'Slackline',                         'Slackline',                       'teenagers',      29),
  ('step_stones',          'fitness',             'Step stones',                       'Pedras de equilíbrio',            'toddlers',       30)
on conflict (type) do update set
  category_id = excluded.category_id,
  label_en = excluded.label_en,
  label_pt = excluded.label_pt,
  default_age_group = excluded.default_age_group,
  sort_order = excluded.sort_order;

insert into public.equipment_catalog (type, category_id, label_en, label_pt, default_age_group, sort_order) values
  ('water_table',          'creativity',          'Water table',                       'Mesa de água',                    'toddlers',       31),
  ('outdoor_chalkboard',   'creativity',          'Outdoor chalkboard',                'Quadro de giz',                   'preschool',      32),
  ('stone_path',           'creativity',          'Stone path',                        'Caminho de pedra',                'all',            33),
  ('telescope',            'creativity',          'Telescope',                         'Telescópio',                      'schoolchildren', 34),
  ('drinking_fountain',    'amenities',           'Drinking fountain',                 'Fonte de água',                   'all',            35),
  ('stroller_parking',     'amenities',           'Stroller parking',                  'Parque de carrinhos',             'all',            36),
  ('music_xylophone',      'sensory_play',        'Music xylophone',                   'Xilofone musical',                'preschool',      37),
  ('tactile_panel',        'sensory_play',        'Tactile panel',                     'Painel tátil',                    'toddlers',       38),
  ('optical_illusion_panel','sensory_play',       'Optical illusion panel',            'Painel de ilusão ótica',          'preschool',      39),
  ('tic_tac_toe_wall',     'sensory_play',        'Tic-tac-toe wall game',             'Jogo do galo de parede',          'preschool',      40),
  ('in_ground_trampoline', 'adventure_course',    'In-ground trampoline',              'Cama elástica enterrada',         'schoolchildren', 41),
  ('tire_obstacle_course', 'adventure_course',    'Tire obstacle course',              'Percurso de pneus',               'schoolchildren', 42),
  ('rope_bridge',          'adventure_course',    'Rope bridge',                       'Ponte de corda',                  'schoolchildren', 43),
  ('jump_rope_station',    'adventure_course',    'Jump rope station',                 'Estação de saltar à corda',       'schoolchildren', 44),
  ('sitting_logs',         'adventure_course',    'Sitting logs',                      'Troncos de sentar',               'preschool',      45),
  ('stone_slide',          'adventure_course',    'Stone slide',                       'Escorregador de pedra',           'preschool',      46),
  ('natural_climbing_area','adventure_course',    'Natural climbing area',             'Área de escalada natural',        'schoolchildren', 47),
  ('sensory_garden_bed',   'nature_play',         'Sensory garden bed',                'Canteiro sensorial',              'toddlers',       48),
  ('birdhouse_feeder',     'nature_play',         'Birdhouse / feeder station',        'Casa de pássaros',                'all',            49),
  ('picnic_table_canopy',  'gathering_hub',       'Picnic table with canopy',          'Mesa de piquenique com toldo',    'all',            50),
  ('table_game_station',   'gathering_hub',       'Table game station',                'Estação de jogos de mesa',        'schoolchildren', 51),
  ('pet_water_fountain',   'gathering_hub',       'Pet water fountain',                'Fonte para animais',              'all',            52),
  ('platform_swing',       'inclusive_play',      'Platform swing',                    'Baloiço de plataforma',           'preschool',      53),
  ('accessible_play_table','inclusive_play',      'Accessible play table',             'Mesa de jogo acessível',          'preschool',      54),
  ('large_print_panel',    'inclusive_play',      'Large print panel',                 'Painel de letras grandes',        'preschool',      55),
  ('accessible_seating',   'inclusive_play',      'Accessible seating area',           'Área de estar acessível',         'all',            56),
  ('mini_slide',           'toddler_zone',        'Mini slide',                        'Mini escorregador',               'toddlers',       57),
  ('bee_spring_rider',     'toddler_zone',        'Bee spring rider',                  'Baloiço de mola abelha',          'toddlers',       58),
  ('crawling_tunnel',      'toddler_zone',        'Crawling tunnel',                   'Túnel de gatinhar',               'toddlers',       59)
on conflict (type) do update set
  category_id = excluded.category_id,
  label_en = excluded.label_en,
  label_pt = excluded.label_pt,
  default_age_group = excluded.default_age_group,
  sort_order = excluded.sort_order;

insert into public.equipment_catalog (type, category_id, label_en, label_pt, default_age_group, sort_order) values
  ('soft_play_modules',    'toddler_zone',        'Soft play modules',                 'Módulos soft play',               'toddlers',       60),
  ('sand_play_table',      'toddler_zone',        'Sand play table',                   'Mesa de areia',                   'toddlers',       61),
  ('toddler_book_nook',    'toddler_zone',        'Toddler book nook',                 'Cantinho de leitura',             'toddlers',       62),
  ('sound_effect_board',   'interactive_elements','Sound effect board',                'Painel de efeitos sonoros',       'preschool',      63),
  ('musical_pipes',        'interactive_elements','Musical pipes',                     'Tubos musicais',                  'preschool',      64),
  ('u_rack_bike_parking',  'expanded_amenities',  'U-rack bike parking',               'Parque de bicicletas em U',       'all',            65),
  ('modern_park_light',    'expanded_amenities',  'Modern park light',                 'Iluminação moderna',              'all',            66),
  ('bike_repair_station',  'expanded_amenities',  'Bike repair station',               'Estação de reparação de bicicletas','all',           67),
  ('smart_gate',           'tech_play',           'Smart gate',                        'Portão inteligente',              'all',            68),
  ('digital_game_screen',  'tech_play',           'Digital game screen',               'Ecrã de jogo digital',            'schoolchildren', 69),
  ('interactive_path',     'tech_play',           'Interactive path',                  'Percurso interativo',             'schoolchildren', 70),
  ('ar_info_panel',        'tech_play',           'AR info panel',                     'Painel de informação RA',         'schoolchildren', 71),
  ('kinetic_power_station','tech_play',           'Kinetic power station',             'Estação de energia cinética',     'schoolchildren', 72),
  ('cascade_stream',       'water_features',      'Cascade stream',                    'Riacho em cascata',               'all',            73),
  ('flower_sprinkler',     'water_features',      'Flower sprinkler',                  'Aspersor de flor',                'all',            74),
  ('water_wheel',          'water_features',      'Water wheel',                       'Roda de água',                    'preschool',      75),
  ('market_stall',         'water_features',      'Market stall',                      'Banca de mercado',                'all',            76),
  ('pedal_pump',           'water_features',      'Pedal pump',                        'Bomba de pedal',                  'schoolchildren', 77),
  ('amphitheater_stage',   'imaginative_stages',  'Amphitheater stage',                'Palco anfiteatro',                'schoolchildren', 78),
  ('lookout_tower',        'imaginative_stages',  'Lookout tower',                     'Torre de vigia',                  'schoolchildren', 79),
  ('multisport_court',     'sports_zone',         'Multisport court',                  'Campo multiusos',                 'schoolchildren', 80),
  ('soccer_pitch',         'sports_zone',         'Soccer pitch',                      'Campo de futebol',                'schoolchildren', 81),
  ('calisthenics_frame',   'sports_zone',         'Calisthenics frame',                'Estrutura de calistenia',         'teenagers',      82),
  ('alphabet_panel',       'learning_elements',   'Alphabet panel',                    'Painel do alfabeto',              'preschool',      83),
  ('number_wall',          'learning_elements',   'Number wall',                       'Parede dos números',              'preschool',      84),
  ('compass_floor_design', 'learning_elements',   'Compass floor design',              'Bússola no chão',                 'schoolchildren', 85),
  ('musical_notes_panel',  'learning_elements',   'Musical notes panel',               'Painel de notas musicais',        'preschool',      86),
  ('surveillance_camera',  'maintenance_safety',  'Surveillance camera',               'Câmara de vigilância',            'all',            87),
  ('dog_park_zone',        'functional_zones',    'Dog park zone',                     'Zona de cães',                    'all',            88),
  ('shade_structure',      'functional_zones',    'Shade structure',                   'Estrutura de sombra',             'all',            89)
on conflict (type) do update set
  category_id = excluded.category_id,
  label_en = excluded.label_en,
  label_pt = excluded.label_pt,
  default_age_group = excluded.default_age_group,
  sort_order = excluded.sort_order;


