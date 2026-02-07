// Centralized asset registry
// All require() references live here so swapping textures/illustrations is one-file change.

export const illustrations = {
  dino: require('@assets/images/dino.png'),
  tree: require('@assets/images/tree.png'),
  bush: require('@assets/images/bush.png'),
  bonsai: require('@assets/images/bonsai.png'),
  doodle: require('@assets/images/doodle.png'),
} as const;

export const textures = {
  paper: require('@assets/texture/paper.jpg'),
  paperWarm: require('@assets/texture/paper_warm.jpg'),
  noiseOverlay: require('@assets/texture/noise_overlay.webp'),
  grassBg: require('@assets/texture/grass_bg.webp'),
  grassBgDark: require('@assets/texture/grass_bg_dark.webp'),
  grassBgLight: require('@assets/texture/grass_bg_light.webp'),
} as const;

export const avatars = {
  dino: require('@assets/avatars/dino.png'),
  trex: require('@assets/avatars/trex.png'),
} as const;

export const fontFiles = {
  SpaceMono: require('@assets/fonts/SpaceMono-Regular.ttf'),
  Dyslexic: require('@assets/fonts/OpenDyslexic-Regular.otf'),
} as const;

export const defaults = {
  mascot: illustrations.dino,
  backgroundTexture: textures.paper,
  noiseTexture: textures.noiseOverlay,
  preloadImages: [
    require('@assets/images/icon.png'),
    illustrations.dino,
    textures.noiseOverlay,
    textures.paper,
  ] as (string | number)[],
} as const;

export const illustrationOptions = [
  { id: 'dino', name: 'Dino', source: illustrations.dino },
  { id: 'tree', name: 'Tree', source: illustrations.tree },
  { id: 'bush', name: 'Bush', source: illustrations.bush },
  { id: 'bonsai', name: 'Bonsai', source: illustrations.bonsai },
  { id: 'doodle', name: 'Doodle', source: illustrations.doodle },
] as const;
