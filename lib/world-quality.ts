export type WorldQuality = 'quality' | 'low';

export const worldQualitySettings = {
  quality: { shadows: true, reflections: true, pixelRatio: 1.5, reducedEnvironment: false },
  low: { shadows: false, reflections: false, pixelRatio: 0.75, reducedEnvironment: true },
} as const;
