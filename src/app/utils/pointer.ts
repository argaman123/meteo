import { clampToRange } from './time';

export function pointerFraction(event: MouseEvent): { x: number; y: number } {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  return {
    x: clampToRange((event.clientX - box.left) / box.width, 0, 1),
    y: clampToRange((event.clientY - box.top) / box.height, 0, 1),
  };
}
