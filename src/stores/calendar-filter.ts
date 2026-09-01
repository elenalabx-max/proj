import { create } from "zustand";

type CalendarFilterState = {
  showPersonal: boolean;
  showWork: boolean;
  // 未出現在這個 map 的 Project 視為預設勾選（true）。
  hiddenProjectIds: Set<string>;
  togglePersonal: () => void;
  toggleWork: () => void;
  toggleProject: (id: string) => void;
  isProjectVisible: (id: string) => boolean;
};

export const useCalendarFilterStore = create<CalendarFilterState>((set, get) => ({
  showPersonal: true,
  showWork: true,
  hiddenProjectIds: new Set(),
  togglePersonal: () => set((s) => ({ showPersonal: !s.showPersonal })),
  toggleWork: () => set((s) => ({ showWork: !s.showWork })),
  toggleProject: (id) =>
    set((s) => {
      const next = new Set(s.hiddenProjectIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { hiddenProjectIds: next };
    }),
  isProjectVisible: (id) => !get().hiddenProjectIds.has(id),
}));
