import { createContext, useContext } from 'react';

export const SECTION_INDEX = { home: 0, goals: 1, calendar: 2, insights: 3, settings: 4 };

export const SectionContext = createContext(null);

/** Lets any section switch sections, or lock section-swiping during its own gestures. */
export function useSections() {
  return useContext(SectionContext);
}
