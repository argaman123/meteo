import { VectorField } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { GridIcon, GridIcons } from '../base/grid-icons';

export class Arrows extends GridIcons {
  protected readonly sizeFactor = 1.1;

  constructor(
    provider: Provider<VectorField>,
    private readonly longestAt: number,
  ) {
    super(provider);
  }

  protected iconAt(eastward: number, northward: number): GridIcon {
    const length =
      Math.round(Math.min(1, Math.hypot(eastward, northward) / this.longestAt) * 8) / 8;
    return {
      key: `${length}`,
      angle: (Math.atan2(eastward, northward) * 180) / Math.PI,
      draw: (context) => {
        const half = 12 + 48 * length;
        context.lineWidth = 7;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(64, 64 + half);
        context.lineTo(64, 64 - half);
        context.moveTo(40, 88 - half);
        context.lineTo(64, 64 - half);
        context.lineTo(88, 88 - half);
        context.stroke();
      },
    };
  }
}
