import type { SlidesPerView } from './types';
export const modulo = (value: number, length: number) => (length ? ((value % length) + length) % length : 0);
export const positiveInteger = (value: number, fallback = 1) =>
  Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
export const finiteNumber = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
export const loopPosition = (position: number, band: number, length: number, stride: number) =>
  stride ? band * stride + modulo(position - band * stride, length * stride) : 0;
export function visibleCount(width: number, config: SlidesPerView): number {
  if (typeof config === 'number') return Math.min(100, positiveInteger(config));
  const breakpoint = Object.keys(config)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .find(point => width <= point);
  return Math.min(100, positiveInteger(breakpoint === undefined ? config.max : config[breakpoint]));
}
