export interface GrassSettings {
  count: number;
  width: number;
  height: number;
  
  // Colors
  baseColor: string;
  tipColor: string;
  baseColorPatch: string;
  tipColorPatch: string;
  colorNoiseScale: number;

  windStrength: number;
  windSpeed: number;
  windTurbulence: number;
  radius: number;
  noiseScale: number;
  noiseThreshold: number;
  fillEmptySpaces: boolean;
  fillerCount: number;
  fillerSpread: number;
  fillerAnimated: boolean;
  bladeCurve: number;
  
  propertiesLocked: boolean;
  fillerWidth: number;
  fillerHeight: number;
  fillerBladeCurve: number;
  fillerWindStrength: number;
  fillerWindSpeed: number;
  fillerWindTurbulence: number;
  fillerColorNoiseScale: number;
  fillerBaseColor: string;
  fillerTipColor: string;
  fillerBaseColorPatch: string;
  fillerTipColorPatch: string;
}

export const GRASS_PRESETS: Record<string, Partial<GrassSettings>> = {
  'Ghibli Summer': {
    baseColor: '#105244',
    tipColor: '#8ee04a',
    baseColorPatch: '#0b3a30',
    tipColorPatch: '#b5f56a',
    colorNoiseScale: 0.3,
  },
  'Autumn Fields': {
    baseColor: '#4a2f1b',
    tipColor: '#d67f27',
    baseColorPatch: '#5e1706',
    tipColorPatch: '#e0c04a',
    colorNoiseScale: 0.2,
  },
  'Dry Savanna': {
    baseColor: '#5c5233',
    tipColor: '#d1b975',
    baseColorPatch: '#4a3d1c',
    tipColorPatch: '#e6d398',
    colorNoiseScale: 0.25,
  },
  'Midnight Glow': {
    baseColor: '#0a1024',
    tipColor: '#2b578c',
    baseColorPatch: '#050814',
    tipColorPatch: '#3f98c7',
    colorNoiseScale: 0.4,
  },
  'Alien Flora': {
    baseColor: '#270838',
    tipColor: '#9d32d1',
    baseColorPatch: '#130624',
    tipColorPatch: '#f0438b',
    colorNoiseScale: 0.35,
  }
};
