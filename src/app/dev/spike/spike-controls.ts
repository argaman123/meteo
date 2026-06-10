import { Component, OnInit, inject, signal } from '@angular/core';
import { MapEngine } from '../../engine/map-engine';
import { SpikeModelId, loadSpikeLayers } from './spike-data';

@Component({
  selector: 'app-spike-controls',
  templateUrl: './spike-controls.html',
  styleUrl: './spike-controls.css',
})
export class SpikeControls implements OnInit {
  private engine = inject(MapEngine);

  models: { id: SpikeModelId; label: string }[] = [
    { id: 'wide', label: 'מודל רחב' },
    { id: 'local', label: 'מודל מקומי' },
  ];
  forecastHoursOptions = [0, 6, 12];
  model = signal<SpikeModelId>('wide');
  forecastHours = signal(0);

  ngOnInit(): void {
    void this.reload();
  }

  setModel(id: SpikeModelId): void {
    this.model.set(id);
    void this.reload();
  }

  setForecastHours(hours: number): void {
    this.forecastHours.set(hours);
    void this.reload();
  }

  private async reload(): Promise<void> {
    await loadSpikeLayers(this.engine, this.model(), this.forecastHours());
  }
}
