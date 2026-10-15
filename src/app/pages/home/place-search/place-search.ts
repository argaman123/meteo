import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMapPin, lucideX } from '@ng-icons/lucide';
import { BrnAutocomplete } from '@spartan-ng/brain/autocomplete';
import { HlmAutocompleteImports } from '@spartan-ng/helm/autocomplete';
import { HlmButton } from '@spartan-ng/helm/button';
import { MapPin } from '../../../directives/map-pin';
import { Place } from '../../../objects/place';
import { CoordinatesForm } from './coordinates-form/coordinates-form';
import { PlaceSearchService } from './place-search-service';

@Component({
  selector: 'app-place-search',
  imports: [CoordinatesForm, HlmAutocompleteImports, HlmButton, MapPin, NgIcon],
  viewProviders: [provideIcons({ lucideMapPin, lucideX })],
  host: { class: 'block' },
  templateUrl: './place-search.html',
})
export class PlaceSearch {
  protected placeSearchService = inject(PlaceSearchService);
  private autocomplete = viewChild.required(BrnAutocomplete);
  protected query = signal('');
  protected isEnteringCoordinates = signal(false);
  protected results = computed(() => this.placeSearchService.findPlaces(this.query()));

  protected openSearch(): void {
    this.autocomplete().open();
  }

  protected pickPlace(place: Place | null | undefined): void {
    if (!place) return;
    this.placeSearchService.showPlace(place);
    this.autocomplete().resetValue();
  }

  protected showCoordinates(point: [number, number]): void {
    const format = this.placeSearchService.entryFormat();
    this.placeSearchService.showPlace(Place.fromCoordinates(this.query(), point, format));
    this.autocomplete().resetValue();
    this.autocomplete().close();
  }
}
