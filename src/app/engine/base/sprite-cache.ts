export interface LabelIcon {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

export class SpriteCache {
  private readonly sprites = new Map<string, LabelIcon>();

  spriteOf(key: string, create: () => HTMLCanvasElement): LabelIcon {
    const cached = this.sprites.get(key);
    if (cached) return cached;
    const canvas = create();
    const sprite = {
      url: canvas.toDataURL(),
      width: canvas.width,
      height: canvas.height,
      anchorX: canvas.width / 2,
      anchorY: canvas.height / 2,
    };
    this.sprites.set(key, sprite);
    return sprite;
  }

  clear(): void {
    this.sprites.clear();
  }
}
