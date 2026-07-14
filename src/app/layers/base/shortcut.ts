import { LookKind } from '../../engine/base/look';
import { Layer } from './layer';

export class Shortcut {
  constructor(
    readonly name: string,
    readonly parts: { layer: Layer; looks: LookKind[] }[],
  ) {}
}
