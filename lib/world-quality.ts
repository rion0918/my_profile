export type WorldQuality = 'quality' | 'low';

export const worldQualityLabels = { quality: 'クオリティ', low: '低設定' } as const;

export const worldQualitySettings = {
  quality: { shadows: true, reflections: true, pixelRatio: 1.5, mobilePixelRatio: 2, reducedEnvironment: false },
  low: { shadows: false, reflections: false, pixelRatio: 0.75, mobilePixelRatio: 0.75, reducedEnvironment: true },
} as const;
