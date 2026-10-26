import { rgba } from '../../utils/color-scale';
import { Look, LookKind } from '../base/look';
import { LineOverlay, Overlay } from '../base/overlay';
import { OUTLINE_COLOR } from '../map-service';

export interface PathInput {
  points: [number, number][];
  nextPoint: [number, number] | null;
}

export class Path extends Look<PathInput> {
  readonly kind = LookKind.Lines;

  buildLook(input: PathInput): Overlay[] {
    const last = input.points[input.points.length - 1];
    return [
      new LineOverlay([{ path: input.points, color: rgba(OUTLINE_COLOR, 200), width: 5 }]),
      new LineOverlay([{ path: input.points, color: rgba('#ffffff', 255), width: 2.5 }]),
      new LineOverlay(
        input.nextPoint ? [{ path: [last, input.nextPoint], color: rgba('#ffffff', 200), width: 2 }] : [],
        true,
      ),
    ];
  }
}
