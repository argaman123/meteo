import { describe, expect, it } from 'vitest';
import { ColorStop } from '../../layers/layer-definition';
import { mercatorLatitudes, paletteRgba } from './colormap-renderer';

const palette: ColorStop[] = [
  { value: 0, color: '#000000' },
  { value: 10, color: '#ff0000' },
];

describe('paletteRgba', () => {
  it('interpolates smoothly between stops', () => {
    expect(paletteRgba(5, palette, 'smooth')).toEqual([128, 0, 0, 255]);
  });
  it('holds the band color when stepped', () => {
    expect(paletteRgba(5, palette, 'stepped')).toEqual([0, 0, 0, 255]);
    expect(paletteRgba(10, palette, 'stepped')).toEqual([255, 0, 0, 255]);
  });
  it('clamps outside the stops', () => {
    expect(paletteRgba(-5, palette, 'smooth')).toEqual([0, 0, 0, 255]);
    expect(paletteRgba(15, palette, 'smooth')).toEqual([255, 0, 0, 255]);
  });
});

describe('mercatorLatitudes', () => {
  it('spaces rows linearly in mercator Y, not latitude', () => {
    const latitudes = mercatorLatitudes(60, 0, 5);
    expect(latitudes[0]).toBeCloseTo(60, 6);
    expect(latitudes[4]).toBeCloseTo(0, 6);
    expect(latitudes[2]).toBeGreaterThan(30);
  });
});
