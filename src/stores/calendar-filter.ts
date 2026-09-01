import { create } from "zustand";

type CalendarFilterState = {
  showPersonal: boolean;
  showWork: boolean;
  // 未出現在這個 map 的 Project 視為預設勾選（true）。
  hiddenProjectIds: Set<string>;
  togglePersonal: () => void;
  toggleWork: () => void;
  toggleProject: (id: string) => void;
};

// 沒有 isProjectVisible(id) 這種 helper method 是刻意的——它回傳的函式參照永遠不變，
// 用它當 selector 會讓 Zustand 判斷「選到的值沒變」而跳過重新 render，切換 Project
// 勾選會變得要等到別的原因觸發 re-render 才生效，感覺卡卡的。要判斷可不可見，
// 直接選 hiddenProjectIds 本身，再用 `!hiddenProjectIds.has(id)` 現算。
export const useCalendarFilterStore = create<CalendarFilterState>((set) => ({
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
}));
