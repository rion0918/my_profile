import { halls, type HallId } from './world-halls.ts';
import { centralPlaza } from './world-zones.ts';

const tourIds: HallId[] = ['history', 'experience', 'yoin', 'pop-reminder'];
export const tourStops = tourIds.map(id => ({ id, title: halls.find(h => h.id === id)!.name }));
export function hallMarker(id: string) {
  const index = tourIds.indexOf(id as HallId);
  return index >= 0 ? String(index + 1).padStart(2, '0') : id === 'github' ? 'G' : 'Z';
}
export const tourFork = centralPlaza;
export type TourPhase = 'intro' | 'focusing' | 'reading' | 'complete' | 'exploring';
