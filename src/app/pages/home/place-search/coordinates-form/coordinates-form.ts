import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MaskitoDirective } from '@maskito/angular';
import { maskitoWithPlaceholder } from '@maskito/kit';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { CoordinateFormat, parseCoordinates } from '../../../../utils/coordinates';
import { coordinateFormat } from '../../settings-panel/settings-controls';
import { PlaceSearchService } from '../place-search-service';

// TODO: UNVERIFIED CODE BELOW
const FORMAT_PATTERNS: Record<CoordinateFormat, string> = {
  [CoordinateFormat.Decimal]: '##.#### N, ##.#### E',
  [CoordinateFormat.DegreesMinutesSeconds]: `##°##'##"N ##°##'##"E`,
  [CoordinateFormat.Utm]: '36 ######E #######N',
  [CoordinateFormat.OperationalGrid]: '## ## אא',
};

const FORMAT_MASKS = new Map(
  Object.entries(FORMAT_PATTERNS).map(([format, pattern]) => {
    const { removePlaceholder, ...placeholder } = maskitoWithPlaceholder(
      pattern.replace(/[#א\d]/g, '_'),
    );
    const mask = [...pattern].map((char) =>
      char === 'א' ? /[א-ת]/ : /[#\d]/.test(char) ? /\d/ : char,
    );
    return [format as CoordinateFormat, { options: { ...placeholder, mask }, removePlaceholder }];
  }),
);

@Component({
  selector: 'app-coordinates-form',
  imports: [HlmButton, HlmInput, HlmTabsImports, MaskitoDirective],
  host: { class: 'flex flex-col gap-3' },
  templateUrl: './coordinates-form.html',
})
export class CoordinatesForm {
  protected placeSearchService = inject(PlaceSearchService);
  private injector = inject(Injector);
  private field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  protected readonly formats = coordinateFormat.choices;
  protected mask = computed(() => FORMAT_MASKS.get(this.placeSearchService.entryFormat())!);
  protected text = signal(this.startTextOf(this.placeSearchService.entryFormat()));
  protected point = computed(() =>
    parseCoordinates(
      this.mask().removePlaceholder(this.text()),
      this.placeSearchService.entryFormat(),
    ),
  );
  readonly entered = output<[number, number]>();

  constructor() {
    afterNextRender(() => this.field().nativeElement.focus());
  }

  protected selectFormat(format: string): void {
    this.placeSearchService.entryFormat.set(format as CoordinateFormat);
    this.text.set(this.startTextOf(format as CoordinateFormat));
    afterNextRender(() => this.field().nativeElement.focus(), { injector: this.injector });
  }

  protected showPoint(): void {
    const point = this.point();
    if (point) this.entered.emit(point);
  }

  private startTextOf(format: CoordinateFormat): string {
    return FORMAT_PATTERNS[format].replace(/[#א]/g, '_');
  }
}
