import maplibregl from 'maplibre-gl';

export type BasemapId = 'dark' | 'light' | 'colorful';

export async function loadBasemapStyle(id: BasemapId): Promise<maplibregl.StyleSpecification> {
  const response = await fetch(`/basemaps/styles/${id}.json`);
  const style = (await response.json()) as maplibregl.StyleSpecification;
  if (typeof style.sprite === 'string' && style.sprite.startsWith('/')) {
    style.sprite = location.origin + style.sprite;
  }
  if (style.glyphs?.startsWith('/')) {
    style.glyphs = location.origin + style.glyphs;
  }
  for (const source of Object.values(style.sources)) {
    if ('url' in source && source.url?.startsWith('pmtiles:///')) {
      source.url = `pmtiles://${location.origin}/${source.url.slice('pmtiles:///'.length)}`;
    }
  }
  return style;
}
