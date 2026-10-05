export interface BirdDetection {
  coords: [[number, number]];
  params: { name: string; value: string }[];
  radar: string;
  obsTime: number;
}
