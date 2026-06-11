import { Bounds } from '../../../types/field-grid';

export interface AreaOfInterest {
  id: string;
  label: string;
  bounds: Bounds;
}

export const areasOfInterest: AreaOfInterest[] = [
  { id: 'east-med', label: 'מזרח הים התיכון', bounds: [25, 30, 37, 38] },
  { id: 'red-sea', label: 'ים סוף', bounds: [32, 12, 44, 30] },
  { id: 'gulf', label: 'המפרץ', bounds: [46, 23, 57, 31] },
];
