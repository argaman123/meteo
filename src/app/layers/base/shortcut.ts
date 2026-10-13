import { LookKind } from '../../engine/base/look';
import { Layer } from './layer';

export enum ShortcutType {
  Layers = 'layers',
  Link = 'link',
}

export class Shortcut {
  readonly type = ShortcutType.Layers;

  constructor(
    readonly name: string,
    readonly parts: { layer: Layer<unknown>; looks: LookKind[] }[],
    readonly icon = '',
  ) {}
}

export class ShortcutLink {
  readonly type = ShortcutType.Link;

  constructor(
    readonly name: string,
    readonly url: string,
    readonly icon = '',
  ) {}
}
