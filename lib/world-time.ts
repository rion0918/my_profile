// Local civil time: a daily art direction, without location or network access.
type Palette = {
  sky: number; skyLight: number; groundLight: number; sunColor: number; fillColor: number;
  ambientIntensity: number; sunIntensity: number; fillIntensity: number;
  lamps: number; waterLight: number; sunX: number; sunY: number; sunZ: number;
};
const night: Palette = {
  sky: 0x14243d, skyLight: 0x9eb5e3, groundLight: 0x596182,
  sunColor: 0xa1baff, fillColor: 0x789fc4,
  ambientIntensity: 0.95, sunIntensity: 0.9, fillIntensity: 0.65,
  lamps: 1, waterLight: 0.2, sunX: -18, sunY: 28, sunZ: -16,
};
const dawn: Palette = {
  sky: 0xe9b7a5, skyLight: 0xc8c2e4, groundLight: 0xa09baa,
  sunColor: 0xffb575, fillColor: 0xb3b6e4,
  ambientIntensity: 1.1, sunIntensity: 1.8, fillIntensity: 0.7,
  lamps: 0.5, waterLight: 0.65, sunX: 28, sunY: 12, sunZ: 18,
};
const day: Palette = {
  sky: 0xbcdce3, skyLight: 0xd3e6ff, groundLight: 0xb6b0bd,
  sunColor: 0xffeed4, fillColor: 0xb9c8ed,
  ambientIntensity: 1.65, sunIntensity: 3, fillIntensity: 1.1,
  lamps: 0, waterLight: 1, sunX: -8, sunY: 38, sunZ: 19,
};
const evening: Palette = {
  sky: 0xe8ae98, skyLight: 0xbec3ed, groundLight: 0xb29acb,
  sunColor: 0xffb278, fillColor: 0xb3a2ed,
  ambientIntensity: 1.15, sunIntensity: 2.3, fillIntensity: 0.85,
  lamps: 0.55, waterLight: 0.65, sunX: -30, sunY: 12, sunZ: 19,
};
const frames: [number, Palette][] = [
  [0, night], [5, night], [6.5, dawn],
  [8, { ...day, sunX: 25, sunY: 25 }], [12, day],
  [16, { ...day, sky: 0xc9d4d3, sunColor: 0xffd0a1, sunX: -22, sunY: 28 }],
  [18, evening],
  [19.5, { ...night, sky: 0x394365, ambientIntensity: 1, sunIntensity: 1, waterLight: 0.28 }],
  [21, night], [24, night],
];
const colors = new Set(['sky', 'skyLight', 'groundLight', 'sunColor', 'fillColor']);
const blendColor = (a: number, b: number, t: number) => [16, 8, 0].reduce(
  (color, shift) => color | Math.round((a >> shift & 255) * (1 - t) + (b >> shift & 255) * t) << shift, 0,
);

export function getWorldTime(date = new Date()): Palette {
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600 + date.getMilliseconds() / 3600000;
  const index = frames.findIndex(([time]) => time > hour);
  const [start, a] = frames[index - 1], [end, b] = frames[index];
  const progress = (hour - start) / (end - start), t = progress * progress * (3 - 2 * progress);
  return Object.fromEntries(Object.keys(a).map(key => {
    const k = key as keyof Palette;
    return [key, colors.has(key) ? blendColor(a[k], b[k], t) : a[k] + (b[k] - a[k]) * t];
  })) as Palette;
}
