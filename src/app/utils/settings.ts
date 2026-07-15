import { WritableSignal, signal } from '@angular/core';
import { LookKind } from '../engine/base/look';
import type { Layer } from '../layers/base/layer';

const bindings = new Map<object, { key: string }>();

export function setting<T>(initial: T): WritableSignal<T> {
  const value = signal(initial);
  const binding = { key: '' };
  const set = value.set.bind(value);
  value.set = (next: T) => {
    set(next);
    if (binding.key) save(binding.key, next);
  };
  bindings.set(value, binding);
  return value;
}

export function registerLayers<T extends Record<string, Layer<unknown>>>(layers: T): T {
  for (const [key, layer] of Object.entries(layers)) {
    bindSettings(layer, key);
    for (const { look } of layer.looks) bindSettings(look, `${key}.${LookKind[look.kind]}`);
  }
  return layers;
}

function bindSettings(owner: object, scope: string): void {
  for (const [field, value] of Object.entries(owner)) {
    const binding = value instanceof Object ? bindings.get(value) : undefined;
    if (!binding) continue;
    const key = `settings.${scope}.${field}`;
    const storedValue = load(key);
    if (storedValue !== undefined) (value as WritableSignal<unknown>).set(storedValue);
    binding.key = key;
  }
}

function load(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function save(key: string, value: unknown): void {
  if (value === null || value === undefined) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(value));
}
